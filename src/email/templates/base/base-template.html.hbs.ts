// Hint: install es6-string-html  Visual Studio Code extension to enable syntax highlighting for HTML in TypeScript files.
export const baseTemplate = /*html*/ `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{appName}} - {{subject}}</title>
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
