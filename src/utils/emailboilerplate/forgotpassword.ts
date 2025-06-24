const forgotPasswordEmailBody = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Forgot Password - OTP</title>
    <!--[if mso]>
    <noscript>
    <xml>
    <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    </noscript>
    <![endif]-->
    <style>
        @media screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
            }
            .header img {
                max-width: 150px !important;
            }
            h2 {
                font-size: 20px !important;
            }
            p {
                font-size: 14px !important;
            }
            .otp {
                font-size: 18px !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f7fc; color: #333333;">
    <!-- Preheader text -->
    <div style="display: none; max-height: 0; overflow: hidden;">
        Reset your password with this one-time code from VolttechAfrica
    </div>
    <!-- Preheader text end -->

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table class="email-container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="padding: 40px 30px 20px 30px; text-align: center;">
                            <img src="https://app.flex.sch.ng/assets/img/logo_flexdesk.png" alt="VolttechAfrica Logo" width="200" style="max-width: 200px; height: auto;">
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 30px;">
                            <h2 style="color: #2558bb; font-size: 24px; margin-bottom: 20px; text-align: center;">Forgot Your Password?</h2>
                            <p style="font-size: 14px; line-height: 1.5; margin-bottom: 20px;">Hi {user_name},</p>
                            <p style="font-size: 14px; line-height: 1.5; margin-bottom: 20px;">We received a request to reset the password for your account. Use the following OTP to proceed with the password reset, expires in five minutes:</p>
                            <p style="text-align: center;">
                                <span style="font-size: 20px; font-weight: bold; color: #2558bb; padding: 10px 20px; background-color: #dde5f5; border-radius: 6px; display: inline-block;">{OTP}</span>
                            </p>
                            <p style="font-size: 14px; line-height: 1.5; margin-bottom: 20px;">If you did not request this change, please ignore this email or contact our support team immediately.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; text-align: center; font-size: 14px; color: #777777;">
                            <p style="margin-bottom: 10px;">Need Help? <a href="mailto:support@volttechafrica.com" style="color: #2558bb; text-decoration: none;">Contact Support</a></p>
                            <p style="margin-bottom: 10px;">Follow us on:</p>
                            <p>
                                <a href="https://facebook.com/VolttechAfrica" style="text-decoration: none;"><img src="https://cdn-icons-png.flaticon.com/256/124/124010.png" alt="Facebook" width="24" style="margin: 0 8px;"></a>
                                <a href="https://twitter.com/VolttechAfrica" style="text-decoration: none;"><img src="https://cdn-icons-png.freepik.com/256/2496/2496110.png?semt=ais_hybrid" alt="Twitter" width="24" style="margin: 0 8px;"></a>
                                <a href="https://linkedin.com/company/VoltechAfrica" style="text-decoration: none;"><img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" width="24" style="margin: 0 8px;"></a>
                            </p>
                            <p style="margin-top: 20px;">&copy; 2024 VolttechAfrica. All Rights Reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

export default forgotPasswordEmailBody;
