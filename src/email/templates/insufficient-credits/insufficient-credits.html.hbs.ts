export const insufficientCreditsPartialTemplate = /*html*/ `
<h1 class="title">{{header}}</h1>
<p>{{greeting}}</p>

<p>{{mainMessage}}</p>

<div class="tip-box">
    <span class="tip-icon">🚨</span>
    <span class="tip-title">{{tipTitle}}</span>
    <span class="tip-content">{{tipContent}}</span>
    <div style="margin-top: 12px;">
        <a href="{{topupUrl}}" target="_blank" class="action-link">{{topupAction}}</a>
    </div>
</div>`;
