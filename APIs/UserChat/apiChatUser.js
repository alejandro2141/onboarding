
const express = require('express');
const app = express();
const PORT = 9001;


// ============================================================
// URL base del API Gateway de Hermes
// ============================================================

// El valor puede ser sobrescrito mediante la variable de entorno
const HERMES_API_BASE_URL =
    process.env.HERMES_API_URL || 'http://localhost:8642';


// ============================================================
// Permitir JSON en las solicitudes
// ============================================================

app.use(express.json());


// ============================================================
// CORS
// ============================================================

app.use((req, res, next) => {

    res.header(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Hermes-Session-Key, X-Hermes-Session-Id"
    );

    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
    );

    next();
});


// ============================================================
// FUNCIÓN:
// Cortar valores string que tengan más de 10 palabras
// ============================================================
//
// Esta función recorre recursivamente:
//
// - Objetos
// - Arrays
// - Strings
//
// Si un string tiene más de 10 palabras:
//
//     primeras 10 palabras + "..."
//
// Ejemplo:
//
// Antes:
// "Esta es una respuesta muy larga que contiene
// muchas palabras adicionales"
//
// Después:
// "Esta es una respuesta muy larga que contiene
// muchas..."
//
// Los números, booleanos y null no se modifican.
// ============================================================

function truncateJsonStrings(value, maxWords = 10) {

    // --------------------------------------------------------
    // String
    // --------------------------------------------------------

    if (typeof value === 'string') {

        const words = value.trim().split(/\s+/);

        if (words.length > maxWords) {

            return words
                .slice(0, maxWords)
                .join(' ') + '...';
        }

        return value;
    }


    // --------------------------------------------------------
    // Array
    // --------------------------------------------------------

    if (Array.isArray(value)) {

        return value.map(item =>
            truncateJsonStrings(item, maxWords)
        );
    }


    // --------------------------------------------------------
    // Objeto
    // --------------------------------------------------------

    if (
        value !== null &&
        typeof value === 'object'
    ) {

        const result = {};

        for (const key of Object.keys(value)) {

            result[key] =
                truncateJsonStrings(
                    value[key],
                    maxWords
                );
        }

        return result;
    }


    // --------------------------------------------------------
    // Otros tipos
    // --------------------------------------------------------

    return value;
}


// ============================================================
// FUNCIÓN:
// Buscar dinámicamente el texto de la respuesta del assistant
// ============================================================
//
// NO se asume:
//
//     output[0]
//
// ni:
//
//     content[0]
//
// Se busca dentro de:
//
//     hermesData.output
//
// un objeto que cumpla:
//
//     type = "message"
//     role = "assistant"
//
// Posteriormente se busca dentro de:
//
//     message.content
//
// un objeto que tenga:
//
//     text
//
// como string.
//
// Esto permite que el mensaje del assistant esté, por ejemplo:
//
//     output[0]
//     output[1]
//     output[2]
//     output[3]
//     ...
//
// y que el elemento con text tampoco necesariamente sea:
//
//     content[0]
//
// ============================================================

function findAssistantResponseText(hermesData) {

    // --------------------------------------------------------
    // Validar que exista output y que sea un array
    // --------------------------------------------------------

    if (
        !hermesData ||
        !Array.isArray(hermesData.output)
    ) {

        return null;
    }


    // --------------------------------------------------------
    // Recorrer TODOS los elementos de output
    // --------------------------------------------------------

    for (
        const outputItem of hermesData.output
    ) {

        // ----------------------------------------------------
        // Buscar específicamente:
        //
        // type = message
        // role = assistant
        // ----------------------------------------------------

        if (
            !outputItem ||
            outputItem.type !== 'message' ||
            outputItem.role !== 'assistant'
        ) {

            continue;
        }


        // ----------------------------------------------------
        // Validar content
        // ----------------------------------------------------

        if (
            !Array.isArray(
                outputItem.content
            )
        ) {

            continue;
        }


        // ----------------------------------------------------
        // Recorrer TODOS los elementos de content
        // ----------------------------------------------------

        for (
            const contentItem of outputItem.content
        ) {

            // ------------------------------------------------
            // Buscar un campo text de tipo string
            // ------------------------------------------------

            if (
                contentItem &&
                typeof contentItem.text === 'string'
            ) {

                return contentItem.text;
            }
        }
    }


    // --------------------------------------------------------
    // No se encontró respuesta del assistant
    // --------------------------------------------------------

    return null;
}


// ============================================================
// POST /api/chat
// ============================================================

app.post('/api/chat', async (req, res) => {

    try {

        // ----------------------------------------------------
        // Obtener campos recibidos
        // ----------------------------------------------------

        let {
            user_role,
            user_input,
            user_conversation_id,
            user_session_id,
            user_session_key,
            user_institution_id
        } = req.body;


        // ----------------------------------------------------
        // Validación de campos OBLIGATORIOS
        // ----------------------------------------------------

        if (!user_input) {

            return res.status(400).json({

                success: false,

                error:
                    "El campo 'user_input' es obligatorio."

            });
        }


        if (!user_session_key) {

            return res.status(400).json({

                success: false,

                error:
                    "El campo 'user_session_key' es obligatorio."

            });
        }


        if (!user_institution_id) {

            return res.status(400).json({

                success: false,

                error:
                    "El campo 'user_institution_id' es obligatorio."

            });
        }


        // ----------------------------------------------------
        // Construir Session-Key para Hermes
        //
        // Formato:
        //
        // [user_institution_id]_[user_session_key]
        //
        // Ejemplo:
        //
        // bchile_lala
        // ----------------------------------------------------

        const hermesSessionKey =
            `${user_institution_id}_${user_session_key}`;


        // ----------------------------------------------------
        // Generar fecha actual
        //
        // Formato:
        //
        // YYYYMMDD
        // ----------------------------------------------------

        const now = new Date();

        const YEAR =
            now.getFullYear().toString();

        const MONTH =
            String(
                now.getMonth() + 1
            ).padStart(2, '0');

        const DAY =
            String(
                now.getDate()
            ).padStart(2, '0');


        // ----------------------------------------------------
        // Generar user_conversation_id por defecto
        //
        // Formato:
        //
        // [institution]_[session_key]_[YEAR][MONTH][DAY]
        // ----------------------------------------------------

        if (!user_conversation_id) {

            user_conversation_id =
                `${user_institution_id}_${user_session_key}_${YEAR}${MONTH}${DAY}`;
        }


        // ----------------------------------------------------
        // Generar user_session_id por defecto
        //
        // Formato:
        //
        // [institution]_[session_key]_[YEAR][MONTH]
        // ----------------------------------------------------

        if (!user_session_id) {

            user_session_id =
                `${user_institution_id}_${user_session_key}_${YEAR}${MONTH}`;
        }


        // ----------------------------------------------------
        // Construir dinámicamente el Endpoint de Hermes
        //
        // Ejemplo:
        //
        // http://localhost:8642/p/bchile_lala/v1/responses
        // ----------------------------------------------------

        const HERMES_API_URL =
            `${HERMES_API_BASE_URL}/p/${encodeURIComponent(
                hermesSessionKey
            )}/v1/responses`;


        // ----------------------------------------------------
        // Construir JSON que será enviado a Hermes
        // ----------------------------------------------------

        const hermesPayload = {

            input: user_input,

            conversation:
                user_conversation_id
        };


        // ----------------------------------------------------
        // Agregar user_role solamente si fue informado
        // ----------------------------------------------------

        if (user_role) {

            hermesPayload.role =
                user_role;
        }


        // ====================================================
        // Mostrar información en consola
        // ====================================================

        console.log(
            '======================================'
        );

        console.log(
            'Solicitud recibida'
        );

        console.log(
            '======================================'
        );


        console.log(
            'user_role            :',
            user_role || '(no informado)'
        );


        console.log(
            'user_input           :',
            user_input
        );


        console.log(
            'user_conversation_id :',
            user_conversation_id
        );


        console.log(
            'user_session_id      :',
            user_session_id
        );


        console.log(
            'user_session_key     :',
            user_session_key
        );


        console.log(
            'user_institution_id  :',
            user_institution_id
        );


        console.log(
            'hermesSessionKey     :',
            hermesSessionKey
        );


        console.log(
            'Fecha utilizada      :',
            `${YEAR}-${MONTH}-${DAY}`
        );


        console.log('');


        console.log(
            'Hermes API URL:'
        );

        console.log(
            HERMES_API_URL
        );


        console.log('');


        console.log(
            'JSON enviado a Hermes:'
        );


        console.log(
            JSON.stringify(
                hermesPayload,
                null,
                2
            )
        );


        // ====================================================
        // Construir headers para Hermes
        // ====================================================

        const hermesHeaders = {

            'Content-Type':
                'application/json',

            'Authorization':
                'Bearer change-me-local-dev',

            'X-Hermes-Session-Key':
                hermesSessionKey,

            'X-Hermes-Session-Id':
                user_session_id
        };


        // ====================================================
        // Enviar solicitud a Hermes
        // ====================================================

        console.log('');

        console.log(
            'Enviando solicitud a Hermes...'
        );


        const hermesResponse =
            await fetch(
                HERMES_API_URL,
                {

                    method: 'POST',

                    headers:
                        hermesHeaders,

                    body:
                        JSON.stringify(
                            hermesPayload
                        )
                }
            );


        // ====================================================
        // Obtener respuesta de Hermes
        // ====================================================

        const contentType =
            hermesResponse.headers.get(
                'content-type'
            );


        let hermesData;


        if (
            contentType &&
            contentType.includes(
                'application/json'
            )
        ) {

            hermesData =
                await hermesResponse.json();

        } else {

            hermesData =
                await hermesResponse.text();
        }


        // ====================================================
        // Crear versión del JSON para mostrar
        //
        // Se mantienen todos los campos de Hermes,
        // pero cualquier string con más de 10 palabras
        // se corta.
        //
        // hermesData NO se modifica.
        // ====================================================

        const hermesDataForDisplay =
            truncateJsonStrings(
                hermesData,
                10
            );


        // ====================================================
        // Mostrar respuesta de Hermes en consola
        // ====================================================

        console.log('');

        console.log(
            '======================================'
        );

        console.log(
            'JSON DE RESPUESTA RECIBIDO DESDE HERMES'
        );

        console.log(
            '======================================'
        );


        console.log(
            JSON.stringify(
                hermesDataForDisplay,
                null,
                2
            )
        );


        console.log(
            '======================================'
        );


        // ====================================================
        // Si Hermes responde con error
        // ====================================================

        if (!hermesResponse.ok) {

            console.error('');

            console.error(
                'Error de Hermes:',
                hermesResponse.status
            );


            console.error(
                'JSON de Hermes:'
            );


            console.error(
                JSON.stringify(
                    hermesDataForDisplay,
                    null,
                    2
                )
            );


            return res.status(
                hermesResponse.status
            ).json({

                success: false,

                error:
                    'Hermes respondió con un error.',

                hermes_status:
                    hermesResponse.status,

                hermes_response:
                    hermesDataForDisplay

            });
        }


        // ====================================================
        // BUSCAR RESPUESTA DEL ASSISTANT
        // ====================================================
        //
        // Ya NO se utiliza:
        //
        // output[0].content[0].text
        //
        // En su lugar:
        //
        // 1. Recorremos todos los elementos de output.
        //
        // 2. Buscamos:
        //
        //       type = "message"
        //       role = "assistant"
        //
        // 3. Dentro de content buscamos text.
        //
        // ====================================================

        const responseText =
            findAssistantResponseText(
                hermesData
            );


        // ====================================================
        // Validar que encontramos el texto
        // ====================================================

        if (responseText === null) {

            console.error('');

            console.error(
                'No fue posible encontrar la respuesta del assistant.'
            );


            console.error('');

            console.error(
                'Se esperaba encontrar dentro de output un objeto con:'
            );

            console.error(
                'type = "message"'
            );

            console.error(
                'role = "assistant"'
            );

            console.error(
                'y dentro de content un campo "text".'
            );


            // ------------------------------------------------
            // Mostrar JSON completo de Hermes
            // ------------------------------------------------

            console.error('');

            console.error(
                'JSON completo recibido desde Hermes:'
            );


            console.error(
                JSON.stringify(
                    hermesDataForDisplay,
                    null,
                    2
                )
            );


            return res.status(502).json({

                success: false,

                error:
                    'La respuesta de Hermes no contiene un mensaje válido de type="message" y role="assistant" con campo text.',

                hermes_response:
                    hermesDataForDisplay

            });
        }


        // ====================================================
        // Respuesta exitosa
        // ====================================================
        //
        // Se devuelve:
        //
        // {
        //     "text": "...",
        //     "hermes_response": {
        //         ...
        //     }
        // }
        //
        // "text":
        //     Respuesta original completa del assistant.
        //
        // "hermes_response":
        //     JSON completo de Hermes, pero con strings
        //     superiores a 10 palabras truncados.
        //
        // ====================================================

        console.log('');

        console.log(
            '======================================'
        );

        console.log(
            'RESPUESTA DEL ASSISTANT ENCONTRADA'
        );

        console.log(
            '======================================'
        );


        console.log(
            responseText
        );


        console.log(
            '======================================'
        );


        return res.status(200).json({

            text:
                responseText,

            hermes_response:
                hermesDataForDisplay

        });

    }


    // ========================================================
    // Error general de la API
    // ========================================================

    catch (error) {

        console.error('');

        console.error(
            '======================================'
        );

        console.error(
            'ERROR EN API'
        );

        console.error(
            '======================================'
        );


        console.error(
            error
        );


        return res.status(500).json({

            success: false,

            error:
                'Error interno del servidor.',

            message:
                error.message

        });
    }

});


// ============================================================
// GET /
// ============================================================

app.get('/', (req, res) => {

    res.json({

        service:
            'Onboarding Admin API',

        status:
            'online',

        port:
            PORT

    });

});


// ============================================================
// Iniciar servidor
// ============================================================

app.listen(
    PORT,
    () => {

        console.log(
            '======================================'
        );


        console.log(
            'Onboarding Admin API iniciada'
        );


        console.log(
            `Servidor escuchando en puerto ${PORT}`
        );


        console.log(
            `http://localhost:${PORT}`
        );


        console.log(
            '======================================'
        );


        console.log(
            `Hermes API Base URL: ${HERMES_API_BASE_URL}`
        );

    }
);


