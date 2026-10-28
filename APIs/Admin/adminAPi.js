
import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execPromise = promisify(exec);
const app = express();
const PORT = process.env.PORT || 9000;

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


// ================================================================
// RUTA DE PERFILES HERMES
// ================================================================

const HERMES_PROFILES_DIR = path.join(
    os.homedir(),
    '.hermes',
    'profiles'
);


// ================================================================
// VALIDACIÓN DE NOMBRES DE PERFIL
// ================================================================

const isValidProfileName = (name) => {
    return name && /^[a-zA-Z0-9_-]+$/.test(name);
};


// ================================================================
// INSTITUCIONES HABILITADAS
// ================================================================

const institutions = [
    'bchile',
    'bestado',
    'weylandyutani'
];


// ================================================================
// VALIDAR INSTITUCIÓN
// ================================================================

const isValidInstitution = (institution) => {
    return institution && institutions.includes(institution);
};


// ================================================================
// CREAR PERFIL
// ================================================================

/**
 * @route   POST /api/profiles
 *
 * JSON:
 *
 * {
 *     "institution": "BChile",
 *     "name": "JuanPerez"
 * }
 *
 * Perfil creado:
 *
 * BChile_JuanPerez
 */

app.post('/api/profiles', async (req, res) => {

    const { institution, name } = req.body;


    // ------------------------------------------------------------
    // 1. Verificar institution
    // ------------------------------------------------------------

    if (!institution) {

        return res.status(400).json({
            success: false,
            error: "El campo 'institution' es obligatorio."
        });

    }


    // ------------------------------------------------------------
    // 2. Validar institution
    // ------------------------------------------------------------

    if (!isValidInstitution(institution)) {

        return res.status(400).json({

            success: false,

            error:
                `Institución '${institution}' no está habilitada en el sistema.`,

            allowedInstitutions: institutions

        });

    }


    // ------------------------------------------------------------
    // 3. Validar name
    // ------------------------------------------------------------

    if (!isValidProfileName(name)) {

        return res.status(400).json({

            success: false,

            error:
                "Nombre inválido. Use únicamente letras, números, guiones o guiones bajos."

        });

    }


    // ------------------------------------------------------------
    // 4. Construir nombre definitivo
    // ------------------------------------------------------------

    const profileName = `${institution}_${name}`;


    // ------------------------------------------------------------
    // 5. Validar nombre definitivo
    // ------------------------------------------------------------

    if (!isValidProfileName(profileName)) {

        return res.status(400).json({

            success: false,

            error:
                "El nombre final del perfil generado no es válido."

        });

    }


    try {

        console.log(
            `[API] Solicitando creación de perfil: ${profileName}`
        );

        console.log(
            `[API] institution: ${institution}`
        );

        console.log(
            `[API] name: ${name}`
        );


        // --------------------------------------------------------
        // Crear perfil mediante Hermes CLI
        // --------------------------------------------------------

        const { stdout } = await execPromise(
            `hermes profile create ${profileName}`
        );


        // --------------------------------------------------------
        // Respuesta
        // --------------------------------------------------------

        return res.status(201).json({

            success: true,

            message:
                `Perfil '${profileName}' creado exitosamente.`,

            institution: institution,

            name: name,

            profile: profileName,

            details: stdout.trim()

        });


    } catch (error) {

        console.error(
            `[API Error Create]:`,
            error.message
        );


        return res.status(500).json({

            success: false,

            error:
                "Error al crear el perfil mediante Hermes CLI.",

            institution: institution,

            name: name,

            profile: profileName,

            details: error.message

        });

    }

});


// ================================================================
// LISTAR PERFILES POR INSTITUCIÓN
// ================================================================

/**
 * @route   POST /api/profiles/list
 *
 * JSON:
 *
 * {
 *     "institution": "BChile"
 * }
 *
 * Devuelve solamente los perfiles:
 *
 * BChile_*
 */

app.post('/api/profiles/list', async (req, res) => {

    const { institution } = req.body;


    // ------------------------------------------------------------
    // 1. Verificar institution
    // ------------------------------------------------------------

    if (!institution) {

        return res.status(400).json({

            success: false,

            error:
                "El campo 'institution' es obligatorio."

        });

    }


    // ------------------------------------------------------------
    // 2. Validar institution
    // ------------------------------------------------------------

    if (!isValidInstitution(institution)) {

        return res.status(400).json({

            success: false,

            error:
                `Institución '${institution}' no está habilitada en el sistema.`,

            allowedInstitutions: institutions

        });

    }


    try {

        console.log(
            `[API] Listando perfiles de institución: ${institution}`
        );


        // --------------------------------------------------------
        // Leer directorio de perfiles
        // --------------------------------------------------------

        const files = await fs.readdir(
            HERMES_PROFILES_DIR,
            {
                withFileTypes: true
            }
        );


        // --------------------------------------------------------
        // Construir prefijo
        //
        // Ejemplo:
        //
        // institution = BChile
        //
        // prefix = BChile_
        // --------------------------------------------------------

        const prefix = `${institution}_`;


        // --------------------------------------------------------
        // Filtrar perfiles de la institución
        // --------------------------------------------------------

        const profiles = files

            .filter(dirent => dirent.isDirectory())

            .map(dirent => dirent.name)

            .filter(profileName =>
                profileName.startsWith(prefix)
            );


        // --------------------------------------------------------
        // Respuesta
        // --------------------------------------------------------

        return res.status(200).json({

            success: true,

            institution: institution,

            prefix: prefix,

            count: profiles.length,

            profiles: profiles

        });


    } catch (error) {

        console.error(
            `[API Error List]:`,
            error.message
        );


        // --------------------------------------------------------
        // Si el directorio no existe
        // --------------------------------------------------------

        if (error.code === 'ENOENT') {

            return res.status(200).json({

                success: true,

                institution: institution,

                prefix: `${institution}_`,

                count: 0,

                profiles: [],

                note:
                    "El directorio físico de perfiles todavía no existe."

            });

        }


        // --------------------------------------------------------
        // Error general
        // --------------------------------------------------------

        return res.status(500).json({

            success: false,

            error:
                "Error interno al leer los perfiles en el disco.",

            details: error.message

        });

    }

});


// ================================================================
// ELIMINAR PERFIL
// ================================================================

/**
 * @route   POST /api/profiles/delete
 *
 * JSON:
 *
 * {
 *     "institution": "BChile",
 *     "name": "JuanPerez"
 * }
 *
 * Perfil eliminado:
 *
 * BChile_JuanPerez
 */

app.post('/api/profiles/delete', async (req, res) => {

    const { institution, name } = req.body;


    // ------------------------------------------------------------
    // 1. Verificar institution
    // ------------------------------------------------------------

    if (!institution) {

        return res.status(400).json({

            success: false,

            error:
                "El campo 'institution' es obligatorio."

        });

    }


    // ------------------------------------------------------------
    // 2. Validar institution
    // ------------------------------------------------------------

    if (!isValidInstitution(institution)) {

        return res.status(400).json({

            success: false,

            error:
                `Institución '${institution}' no está habilitada en el sistema.`,

            allowedInstitutions: institutions

        });

    }


    // ------------------------------------------------------------
    // 3. Verificar name
    // ------------------------------------------------------------

    if (!name) {

        return res.status(400).json({

            success: false,

            error:
                "El campo 'name' es obligatorio."

        });

    }


    // ------------------------------------------------------------
    // 4. Validar name
    // ------------------------------------------------------------

    if (!isValidProfileName(name)) {

        return res.status(400).json({

            success: false,

            error:
                "Nombre de perfil inválido. Use únicamente letras, números, guiones o guiones bajos."

        });

    }


    // ------------------------------------------------------------
    // 5. No permitir eliminar default
    // ------------------------------------------------------------

    if (name.toLowerCase() === 'default') {

        return res.status(400).json({

            success: false,

            error:
                "No está permitido eliminar el perfil 'default' del sistema."

        });

    }


    // ------------------------------------------------------------
    // 6. Construir nombre definitivo
    //
    // institution = BChile
    // name        = JuanPerez
    //
    // Resultado:
    //
    // BChile_JuanPerez
    // ------------------------------------------------------------

    const profileName = `${institution}_${name}`;


    // ------------------------------------------------------------
    // 7. Validar nombre definitivo
    // ------------------------------------------------------------

    if (!isValidProfileName(profileName)) {

        return res.status(400).json({

            success: false,

            error:
                "El nombre final del perfil generado no es válido."

        });

    }


    try {

        console.log(
            `[API] Solicitando eliminación de perfil: ${profileName}`
        );

        console.log(
            `[API] institution: ${institution}`
        );

        console.log(
            `[API] name: ${name}`
        );


        // --------------------------------------------------------
        // Eliminar mediante Hermes CLI
        // --------------------------------------------------------

        const { stdout } = await execPromise(
            `hermes profile delete ${profileName} --yes`
        );


        // --------------------------------------------------------
        // Respuesta
        // --------------------------------------------------------

        return res.status(200).json({

            success: true,

            message:
                `Perfil '${profileName}' y toda su memoria asociada han sido eliminados por completo.`,

            institution: institution,

            name: name,

            profile: profileName,

            details: stdout.trim()

        });


    } catch (error) {

        console.error(
            `[API Error Delete]:`,
            error.message
        );


        return res.status(500).json({

            success: false,

            error:
                "Error al intentar eliminar el perfil mediante Hermes CLI.",

            institution: institution,

            name: name,

            profile: profileName,

            details: error.message

        });

    }

});


// ================================================================
// INICIAR SERVIDOR
// ================================================================

app.listen(PORT, () => {

    console.log(
        `🚀 API completa de Perfiles Hermes corriendo en http://localhost:${PORT}`
    );

});


