const express = require('express');
const app = express();
const PORT = 9001;

// URL base del API Gateway de Hermes
// El valor puede ser sobrescrito mediante la variable de entorno
const HERMES_API_BASE_URL =
    process.env.HERMES_API_URL || 'http://localhost:8642';

// Permitir JSON en las solicitudes
app.use(express.json());


app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // or specify your frontend URL
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});


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
        //
        // user_role              -> OPCIONAL
        // user_conversation_id   -> OPCIONAL
        // user_session_id        -> OPCIONAL
        //
        // user_input             -> OBLIGATORIO
        // user_session_key       -> OBLIGATORIO
        // user_institution_id    -> OBLIGATORIO
        // ----------------------------------------------------

        if (!user_input) {
            return res.status(400).json({
                success: false,
                error: "El campo 'user_input' es obligatorio."
            });
        }

        if (!user_session_key) {
            return res.status(400).json({
                success: false,
                error: "El campo 'user_session_key' es obligatorio."
            });
        }

        if (!user_institution_id) {
            return res.status(400).json({
                success: false,
                error: "El campo 'user_institution_id' es obligatorio."
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
        // YYYYMMDD
        //
        // Ejemplo:
        // 20260913
        // ----------------------------------------------------
        const now = new Date();

        const YEAR =
            now.getFullYear().toString();

        const MONTH =
            String(now.getMonth() + 1).padStart(2, '0');

        const DAY =
            String(now.getDate()).padStart(2, '0');


        // ----------------------------------------------------
        // Generar user_conversation_id por defecto
        //
        // Formato:
        //
        // [institution]_[session_key]_[YEAR][MONTH][DAY]
        //
        // Ejemplo:
        //
        // bchile_lala_20260913
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
        //
        // Ejemplo:
        //
        // bchile_lala_202609
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

            conversation: user_conversation_id
        };


        // ----------------------------------------------------
        // Agregar user_role solamente si fue informado
        // ----------------------------------------------------
        if (user_role) {

            hermesPayload.role = user_role;
        }


        // ----------------------------------------------------
        // Mostrar información en consola
        // ----------------------------------------------------
        console.log('======================================');
        console.log('Solicitud recibida');
        console.log('======================================');

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
        console.log('Hermes API URL:');
        console.log(HERMES_API_URL);

        console.log('');
        console.log('JSON enviado a Hermes:');
        console.log(
            JSON.stringify(hermesPayload, null, 2)
        );


        // ----------------------------------------------------
        // Construir headers para Hermes
        // ----------------------------------------------------
        const hermesHeaders = {

            'Content-Type': 'application/json',

            'Authorization': 'Bearer change-me-local-dev',

            // IMPORTANTE:
            // Hermes recibe ahora:
            //
            // [user_institution_id]_[user_session_key]
            //
            // Ejemplo:
            //
            // bchile_lala
            'X-Hermes-Session-Key': hermesSessionKey,

            'X-Hermes-Session-Id': user_session_id
        };


        // ----------------------------------------------------
        // Enviar solicitud a Hermes
        // ----------------------------------------------------
        const hermesResponse =
            await fetch(HERMES_API_URL, {

                method: 'POST',

                headers: hermesHeaders,

                body: JSON.stringify(hermesPayload)
            });


        // ----------------------------------------------------
        // Obtener respuesta de Hermes
        // ----------------------------------------------------
        const contentType =
            hermesResponse.headers.get('content-type');

        let hermesData;

        if (
            contentType &&
            contentType.includes('application/json')
        ) {

            hermesData =
                await hermesResponse.json();

        } else {

            hermesData =
                await hermesResponse.text();
        }


        // ----------------------------------------------------
        // Si Hermes responde con error
        // ----------------------------------------------------
        if (!hermesResponse.ok) {

            console.error(
                'Error de Hermes:',
                hermesResponse.status
            );

            console.error(hermesData);

            return res.status(
                hermesResponse.status
            ).json({

                success: false,

                error:
                    'Hermes respondió con un error.',

                hermes_status:
                    hermesResponse.status,

                hermes_response:
                    hermesData
            });
        }


        // ----------------------------------------------------
        // Extraer únicamente:
        //
        // hermesData
        //   -> output[0]
        //      -> content[0]
        //         -> text
        // ----------------------------------------------------
        let responseText = null;

        if (
            hermesData &&
            Array.isArray(hermesData.output) &&
            hermesData.output.length > 0 &&
            hermesData.output[0].content &&
            Array.isArray(
                hermesData.output[0].content
            ) &&
            hermesData.output[0].content.length > 0 &&
            typeof
                hermesData.output[0].content[0].text
                === 'string'
        ) {

            responseText =
                hermesData.output[0].content[0].text;
        }


        // ----------------------------------------------------
        // Validar que Hermes haya entregado el campo text
        // ----------------------------------------------------
        if (responseText === null) {

            console.error(
                'La respuesta de Hermes no contiene:',
                'output[0].content[0].text'
            );
            
             // Mostrar respuesta COMPLETA de Hermes
	    console.error(
		'JSON completo recibido desde Hermes:'
	    );

	    console.error(
		JSON.stringify(hermesData, null, 2)
	    );
	    
	    
            

            return res.status(502).json({

                success: false,

                error:
                    'La respuesta de Hermes no contiene el campo output[0].content[0].text.'
            });
        }


        // ----------------------------------------------------
        // Respuesta exitosa
        //
        // La API devuelve SOLO:
        //
        // {
        //     "text": "respuesta de Hermes"
        // }
        // ----------------------------------------------------
        return res.status(200).json({

            text: responseText

        });


    } catch (error) {

        console.error(
            'Error en API:',
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
app.listen(PORT, () => {

    console.log('======================================');

    console.log(
        'Onboarding Admin API iniciada'
    );

    console.log(
        `Servidor escuchando en puerto ${PORT}`
    );

    console.log(
        `http://localhost:${PORT}`
    );

    console.log('======================================');

    console.log(
        `Hermes API Base URL: ${HERMES_API_BASE_URL}`
    );
});


