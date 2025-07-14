export const alertMissingPhoneNumberPartialTemplate = /*html*/ `<div class="content">
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
</div>`;
