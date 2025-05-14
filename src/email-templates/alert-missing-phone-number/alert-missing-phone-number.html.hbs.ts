// Hint: install es6-string-html  Visual Studio Code extension to enable syntax highlighting for HTML in TypeScript files.
export const template = /*html*/ `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{appName}} - {{subject}}</title>
    <style>
        :root {
            --primary-color: #5bba47;
            --secondary-color: #5784d7;
            --accent-color: #f8f9fa;
            --border-color: #e4e7eb;
            --dark-gray: #404040;
            --light-gray: #f7f7f7;
            --border-radius: 8px;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: white;
            border-radius: var(--border-radius);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            border: 1px solid var(--border-color);
        }
        
        .email-header {
            background-color: white;
            padding: 25px 30px;
            text-align: center;
            border-bottom: 1px solid var(--border-color);
            position: relative;
        }
        
        .header-accent {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background-color: var(--secondary-color);
        }
        
        .logo {
            max-width: 180px;
            height: auto;
        }
        
        .content {
            padding: 30px;
        }
        
        .title {
            font-size: 22px;
            font-weight: 600;
            color: var(--dark-gray);
            margin-top: 0;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--border-color);
        }
        
        p {
            margin-bottom: 16px;
            color: #555;
            font-size: 16px;
        }
        
        .tip-box {
            background-color: #f0f7ff;
            border: 1px solid #d0e1fd;
            padding: 18px 20px;
            margin: 25px 0;
            border-radius: var(--border-radius);
            position: relative;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }
        
        .tip-icon {
            display: inline-block;
            width: 24px;
            height: 24px;
            background-color: var(--secondary-color);
            border-radius: 50%;
            color: white;
            text-align: center;
            line-height: 24px;
            font-weight: bold;
            margin-right: 8px;
            font-size: 14px;
            vertical-align: middle;
        }
        
        .tip-title {
            font-weight: 600;
            color: var(--secondary-color);
            margin-right: 5px;
            vertical-align: middle;
        }
        
        .tip-content {
            color: #555;
            display: block;
            margin-top: 8px;
        }
        
        .action-link {
            display: inline-block;
            margin-top: 8px;
            color: var(--secondary-color);
            text-decoration: none;
            font-weight: 500;
        }
        
        .action-link:hover {
            text-decoration: underline;
        }
        
        .help-box {
            background-color: var(--light-gray);
            padding: 16px 20px;
            margin: 25px 0;
            border-radius: var(--border-radius);
            border: 1px solid var(--border-color);
            color: #666;
        }
        
        .help-box p {
            margin: 0;
            font-size: 15px;
        }
        
        .thanks {
            font-weight: 500;
            color: var(--primary-color);
            font-size: 18px;
        }
        
        .footer {
            text-align: center;
            padding: 20px 30px;
            background-color: var(--accent-color);
            color: #777;
            font-size: 14px;
            border-top: 1px solid var(--border-color);
        }
        
        .pattern-bg {
            background-color: #fcfcfc;
            background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.6' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E");
            padding: 40px 20px;
        }
        
        @media only screen and (max-width: 480px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            
            .content, .email-header {
                padding: 20px;
            }
            
            .pattern-bg {
                padding: 20px 10px;
            }
        }
    </style>
</head>
<body>
    <div class="pattern-bg">
        <div class="email-container">
            <div class="email-header">
                <div class="header-accent"></div>
                <img src="{{logoSrc}}" alt="{{appName}}" class="logo">
            </div>
            
            <div class="content">
                <h1 class="title">{{header}}</h1>
                
                <p>{{greeting}}</p>
                
                <p>{{mainMessage}}</p>
                
                <div class="tip-box">
                    <span class="tip-icon">i</span>
                    <span class="tip-title">{{tipTitle}}</span>
                    <span class="tip-content">{{tipContent}}</span>
                    <div style="margin-top: 12px;">
                        {{visitNotifycalFaq}} 
                        <a href="{{notifycalFaqUrl}}" target="_blank" class="action-link">Notifycal FAQ</a>
                    </div>
                </div>
                
                <div class="help-box">
                    <p>{{helpOffer}}</p>
                </div>
                
                <p class="thanks">{{thankYou}}</p>
            </div>
            
            <div class="footer">
                &copy; 2025 {{appName}}. {{rightsReserved}}
            </div>
        </div>
    </div>
</body>
</html>`;
