const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir archivos estáticos de la carpeta public
app.use(express.static('public'));

// Configuración del bot de Discord
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const token = process.env.DISCORD_TOKEN; // O como lo llames en tu código
const CATEGORY_ID = '1541020146892668958'; // ID de tu categoría privada en Discord

// Almacén en memoria para relacionar al usuario de la web con su canal/hilo de Discord
// Estructura: { socketId: { threadId, clientName } }
const activeSessions = {};

discordClient.once('ready', () => {
    console.log(`Bot de Discord conectado como ${discordClient.user.tag}`);
});

// Gestión de conexiones desde la web (Socket.io)
io.on('connection', (socket) => {
    console.log(`Nuevo usuario conectado a la web: ${socket.id}`);

    // Cuando el usuario de la web envía un mensaje
    socket.on('user_message', async (data) => {
        const userText = data.message;
        
        try {
            let session = activeSessions[socket.id];

            // Si el usuario aún no tiene un hilo de soporte creado en Discord, lo creamos
            if (!session) {
                const guild = discordClient.guilds.cache.first(); // O puedes especificar la ID de tu guild si estás en varios servidores
                if (!guild) return;

                // Buscamos la categoría privada
                const category = guild.channels.cache.get(CATEGORY_ID);
                if (!category) {
                    console.error('No se ha encontrado la categoría de Discord especificada.');
                    return;
                }

                // Creamos un canal de texto base dentro de la categoría para albergar el hilo (o usamos un canal existente)
                // O creamos directamente un hilo en un canal de la categoría
                // Como alternativa limpia, creamos un canal dedicado al usuario dentro de la categoría:
                const supportChannel = await guild.channels.create({
                    name: `soporte-${socket.id.substring(0, 6)}`,
                    type: ChannelType.GuildText,
                    parent: category.id,
                    topic: `Ticket de soporte web para la sesión ${socket.id}`
                });

                // Mensaje inicial en el canal de Discord
                await supportChannel.send(`🎫 **Nuevo ticket de soporte web abierto.**\nSesión ID: \`${socket.id}\``);

                activeSessions[socket.id] = {
                    channelId: supportChannel.id,
                    socket: socket
                };
                session = activeSessions[socket.id];
            }

            // Enviamos el mensaje del usuario al canal correspondiente de Discord
            const discordChannel = discordClient.channels.cache.get(session.channelId);
            if (discordChannel) {
                await discordChannel.send(`**Cliente:** ${userText}`);
            }

        } catch (error) {
            console.error('Error al procesar el mensaje hacia Discord:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Usuario desconectado de la web: ${socket.id}`);
        // Opcional: limpiar la sesión o notificar en Discord que el usuario se fue
        delete activeSessions[socket.id];
    });
});

// Cuando el staff responde desde Discord en el canal del ticket o usa comandos de cierre
discordClient.on('messageCreate', async (message) => {
    // Ignorar mensajes del propio bot
    if (message.author.bot) return;

    // Buscamos si el canal donde se ha escrito corresponde a alguna sesión activa de la web
    const sessionEntry = Object.entries(activeSessions).find(([sockId, session]) => session.channelId === message.channel.id);

    if (sessionEntry) {
        const [socketId, session] = sessionEntry;

        // Si el staff escribe "!cerrar", cerramos el ticket
        if (message.content.trim().toLowerCase() === '!cerrar') {
            try {
                // Notificamos al cliente en la web que el ticket se ha cerrado
                session.socket.emit('server_response', {
                    message: '🔒 Este ticket de soporte ha sido cerrado por el staff. ¡Gracias por confiar en Xelcore!'
                });

                // Borramos la sesión activa del array
                delete activeSessions[socketId];

                // Borramos el canal de Discord transcurridos 5 segundos para que dé tiempo a leerse
                await message.channel.send('⚠️ Ticket cerrado. Este canal se eliminará en 5 segundos...');
                setTimeout(async () => {
                    await message.channel.delete().catch(err => console.error('No se pudo borrar el canal:', err));
                }, 5000);

            } catch (error) {
                console.error('Error al cerrar el ticket:', error);
            }
            return;
        }

        // Si es un mensaje normal, lo reenviamos a la web
        session.socket.emit('server_response', {
            message: message.content
        });
    }
});

// Arrancar servidor
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor de soporte Xelcore corriendo en puerto ${PORT}`);
});

// Iniciar sesión en Discord
discordClient.login(DISCORD_TOKEN);