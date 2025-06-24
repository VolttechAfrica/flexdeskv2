import { FastifyInstance } from "fastify";
import nodemailer from 'nodemailer';
import env from '../config/env.js';
import fp from 'fastify-plugin';



const nodemailerPlugin = async (app: FastifyInstance) => {
    const transporter = nodemailer.createTransport({
        host: env.email.host as string, 
        port: parseInt(env.email.port as string, 10),
        auth: {
            user: env.email.user as string,
            pass: env.email.password as string,
        },
    });

    app.decorate("transporter", transporter);
};

export default fp(nodemailerPlugin, {
    name: 'nodemailer',
});