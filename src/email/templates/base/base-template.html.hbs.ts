// Hint: install es6-string-html  Visual Studio Code extension to enable syntax highlighting for HTML in TypeScript files.
export const baseTemplate = /*html*/ `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{appName}} - {{subject}}</title>
    <style>
:root {
  --primary-color: #35D759;
  --secondary-color: #355E5C;
  --accent1-color: #FFC33F;
  --accent2-color: #9F38C8;
  --accent-color: #FBFAF9;
  --border-color: #e4e7eb;
  --primary-100-color: #d9f7df;
  --primary-50-color: #f0fcf2;
  --secondary-100-color: #e6efee;
  --accent2-100-color: #f3e8f9;
  --dark-gray-color: #667085;
  --light-gray-color: #f7f7f7a4;
  --background-color: #f0fcf2;
  --text-color: #212121;
  --text-help-box-color: #545454;
  --border-radius: 8px;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans',
    'Helvetica Neue', sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--light-gray-color);
  margin: 0;
  padding: 0;
}

.email-container {
  max-width: 600px;
  margin: 20px auto;
  background-color: white;
  border-radius: var(--border-radius);
  border: 2px solid var(--border-color);
}

.email-header {
  background-color: var(--secondary-color);
  padding: 25px 30px;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
  border-top: 5px solid var(--primary-color);
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
  color: var(--dark-gray-color);
  margin-top: 0;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
}

p {
  margin-bottom: 16px;
  color: var(--text-color);
  font-size: 16px;
}

a {
  text-decoration: underline;
}

.tip-box {
  background-color: var(--primary-50-color);
  border: 1px solid var(--primary-color);
  padding: 18px 20px;
  margin: 25px 0;
  border-radius: var(--border-radius);
  font-size: 16px;
  color: var(--text-color);
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
  vertical-align: middle;
}

.tip-title {
  font-weight: 600;
  color: var(--secondary-color);
  margin-right: 5px;
  vertical-align: middle;
}

.tip-content {
  color: var(--text-color);
  display: block;
  margin-top: 8px;
}

.action-link {
  display: inline-block;
  margin-top: 8px;
  color: var(--secondary-color);
  text-decoration: none;
  font-weight: 500;
  font-size: 16px;
}

.help-box {
  background-color: var(--light-gray-color);
  padding: 16px 20px;
  margin: 25px 0;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  color: var(--text-help-box-color);
}

.help-box p {
  margin: 0;
  font-size: 13px;
}

.help-link {
  color: var(--dark-gray-color);
}

.thanks {
  font-weight: 500;
  color: var(--primary-color);
  font-size: 18px;
}

.footer {
  text-align: center;
  padding: 20px 30px;
  background-color: var(--secondary-color);
  color: var(--primary-color);
  font-size: 14px;
  font-weight: bold;
  border-top: 1px solid var(--border-color);
  display: block;
}

.pattern-bg {
  background-color: var(--background-color);
  padding: 40px 20px;
}

/* Mobile-friendly defaults */
.email-container {
  width: 100% !important;
  max-width: 600px !important;
  min-width: 320px !important;
}

.content,
.email-header {
  padding: 20px !important;
}

.pattern-bg {
  padding: 20px 10px !important;
}
    </style>
</head>
<body>
    <div class="pattern-bg">
        <div class="email-container">
            <div class="email-header">
                <img src="{{logoSrc}}" alt="{{appName}}" class="logo">
            </div>
            
            <div class="content">
                <p>{{greeting}}</p>
                
                {{>content}}
                
                <p class="thanks">{{thankYou}}</p>

                <div class="help-box">
                    <p>{{helpOfferText}} <a href="{{feedbackUrl}}" class="help-link">{{helpOfferLinkText}}</a></p>
                </div>
            </div>
            
            <div class="footer">
                &copy; 2025 {{appName}}. {{rightsReserved}}
            </div>
        </div>
    </div>
</body>
</html>`;
