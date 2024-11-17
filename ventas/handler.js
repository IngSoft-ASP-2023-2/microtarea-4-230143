const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');
const { validateCard } = require('cardValidator');

const dynamoDB = new AWS.DynamoDB();

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { idTransaccion, cardNumber, nombreEvento } = body;

    if (!validateCard(cardNumber)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Tarjeta de crédito no válida.' }),
      };
    }

    const paramsDynamo = {
      TableName: 'EjecucionesLambda',
      Item: {
        id_transaccion: { S: idTransaccion },
      },
      ConditionExpression: 'attribute_not_exists(id_transaccion)',
    };

    try {
      await dynamoDB.putItem(paramsDynamo).promise();
    } catch (err) {
      if (err.code === 'ConditionalCheckFailedException') {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Transacción ya procesada.' }),
        };
      } else {
        throw err;
      }
    }

    const connection = await mysql.createConnection({
      host: process.env.HOST,
      user: process.env.USER,
      password: process.env.PASSWORD,
      database: process.env.DATABASE,
    });

    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT entradas_disponibles FROM eventos WHERE nombre_evento = ? FOR UPDATE',
      [nombreEvento]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Evento no encontrado.' }),
      };
    }

    const entradasDisponibles = rows[0].entradas_disponibles;

    if (entradasDisponibles <= 0) {
      await connection.rollback();
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'No hay entradas disponibles.' }),
      };
    }

    await connection.execute(
      'UPDATE eventos SET entradas_disponibles = entradas_disponibles - 1 WHERE nombre_evento = ?',
      [nombreEvento]
    );

    await connection.commit();
    await connection.end();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Compra realizada exitosamente.' }),
    };
  } catch (error) {
    console.error(error);

    if (connection) {
      await connection.rollback();
      await connection.end();
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error al procesar la compra.' }),
    };
  }
};
