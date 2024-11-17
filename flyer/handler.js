const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');

exports.handler = async (event) => {
  try {
    const s3Info = event.Records[0].s3;
    const bucketName = s3Info.bucket.name;
    const objectKey = decodeURIComponent(s3Info.object.key.replace(/\+/g, ' '));

    const nombreEvento = objectKey;

    const s3 = new AWS.S3();
    const params = {
      Bucket: bucketName,
      Key: objectKey,
    };

    const flyerData = await s3.getObject(params).promise();
    const flyerBase64 = flyerData.Body.toString('base64');

    const connection = await mysql.createConnection({
      host: 'TU_RDS_HOST',
      user: 'TU_USUARIO',
      password: 'TU_CONTRASEÑA',
      database: 'TU_BASE_DE_DATOS',
    });

    const [rows, fields] = await connection.execute('UPDATE eventos SET flyer = ? WHERE nombre_evento = ?', [
      flyerBase64,
      nombreEvento,
    ]);

    await connection.end();

    return {
      statusCode: 200,
      body: JSON.stringify('Flyer actualizado exitosamente.'),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify('Error al procesar el flyer.'),
    };
  }
};
