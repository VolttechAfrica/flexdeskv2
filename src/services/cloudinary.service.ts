import { v2 as cloudinary } from "cloudinary";

interface UploadResult {
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
    format: string;
    resource_type: string;
    bytes: number;
}

interface SignatureParams {
    timestamp: number;
    folder?: string;
    public_id?: string;
    transformation?: string;
    [key: string]: any;
}

class CloudinaryService {
    private readonly cloudinary: typeof cloudinary;

    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        this.cloudinary = cloudinary;
    }

    async generateSignature(params: SignatureParams) {

        const signature = this.cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET || '');
        return {
            timestamp: params?.timestamp,
            signature,
        };
    }
}

export default CloudinaryService;