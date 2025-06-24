const welcomeEmailBody = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Welcome to Flexdesk!</title>
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
            .credentials {
                font-size: 18px !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f7fc; color: #333333;">
    <!-- Preheader text -->
    <div style="display: none; max-height: 0; overflow: hidden;">
        Welcome to Flexdesk! Get started with your new account.
    </div>
    <!-- Preheader text end -->

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table class="email-container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="padding: 40px 30px 20px 30px; text-align: center;">
                            <img src="https://app.flex.sch.ng/assets/img/logo_flexdesk.png" alt="Flexdesk Logo" width="200" style="max-width: 200px; height: auto;">
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 30px;">
                            <h2 style="color: #2558bb; font-size: 24px; margin-bottom: 20px; text-align: center;">Welcome to Flexdesk, {username}! 🎉</h2>
                            <p style="font-size: 14px; line-height: 1.5; margin-bottom: 20px;">We're excited to have you onboard. Your account has been successfully created with the following credentials:</p>
                            
                            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <p style="margin: 10px 0;"><strong>Username:</strong> <span style="color: #2558bb;">{email}</span></p>
                                <p style="margin: 10px 0;"><strong>Temporary Password:</strong> <span style="color: #2558bb;">{temporaryPassword}</span></p>
                            </div>

                            <p style="font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
                                Please follow these steps to get started:<br>
                                1. Log in using your temporary credentials<br>
                                2. Navigate to your profile settings<br>
                                3. Change your password immediately<br>
                                4. Explore our platform features
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; text-align: center; font-size: 14px; color: #777777;">
                            <p style="margin-bottom: 10px;">Need assistance? Our support team is here to help <a href="mailto:support@volttechafrica.com" style="color: #2558bb; text-decoration: none;">Contact Support</a></p>
                            <p style="margin-bottom: 10px;">Connect with us:</p>
                            <p>
                                <a href="https://facebook.com/VolttechAfrica" style="text-decoration: none;"><img src="https://cdn-icons-png.flaticon.com/256/124/124010.png" alt="Facebook" width="24" style="margin: 0 8px;"></a>
                                <a href="https://twitter.com/VolttechAfrica" style="text-decoration: none;"><img src="https://cdn-icons-png.freepik.com/256/2496/2496110.png?semt=ais_hybrid" alt="Twitter" width="24" style="margin: 0 8px;"></a>
                                <a href="https://linkedin.com/company/VoltechAfrica" style="text-decoration: none;"><img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" width="24" style="margin: 0 8px;"></a>
                            </p>
                            <p style="margin-top: 20px;">&copy; 2024 VolttechAfrica. All Rights Reserved.</p>
                            <p style="font-size: 12px; color: #999999; margin-top: 15px;">
                                This is an automated message - please do not reply directly to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

export default welcomeEmailBody;