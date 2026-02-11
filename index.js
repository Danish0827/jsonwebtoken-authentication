import express, {json} from "express";
import cors from 'cors';
import cookieParser from "cookie-parser";
import dotenv from 'dotenv';
import {dirname,join} from 'path';
import { fileURLToPath } from "url";
import userRoutes from './routes/user-routes.js'
import authRoutes from './routes/auth-routes.js'

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 5000;
const corsOptions = {Credential:true, origin: process.env.URL || '*'};

app.use(cors(corsOptions));
app.use(json());
app.use(cookieParser());

app.use('/', express.static(join(__dirname,'public')));
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);


app.listen(PORT, ()=>console.log(`server is listening on ${PORT}`))