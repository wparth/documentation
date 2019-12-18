/* eslint no-console: ["error", { allow: ["log", "warn"] }] */
import Cookies from 'js-cookie';

const allowedLanguages = ['en', 'ja', 'fr'];
const redirectLanguages = ['ja']
const enabledSubdomains = [
	'docs',
	'docs-staging',
	'corpsite-preview',
	'corpsite-staging',
	'localhost'
];
const cookiePath = '/';

const getUrlVars = () => {
	const vars = {};
	const href = window.location.href.replace(window.location.hash, '');
    href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

const getUrlParts = (data) => {
    const a = document.createElement('a');
    a.href = data;
    return {hostname: a.hostname, pathname: a.pathname};
}


export function handleLanguageBasedRedirects() {
	const params = getUrlVars();
	const supportedLanguage = navigator.language.split('-')[0] || navigator.browserLanguage.split('-')[0];
	const baseURL = getUrlParts(window.location.href).hostname;
	const subdomain = baseURL.split('.')[0];
	const subMatch = enabledSubdomains.filter((i) => subdomain === i);
	let uri = getUrlParts(window.location.href).pathname;
	let previewPath = '';
	let acceptLanguage = 'en';
	let logMsg = '';

	const curLang = uri.split('/').filter((i) => allowedLanguages.indexOf(i) !== -1);

	/* Update URI based on preview links. Branch/feature needs to be moved in front of language redirect
		instead of being appended to the end
		ex: /mybranch/myfeature/index.html => /mybranch/myfeature/ja/index.html
	*/
	if ( subdomain.includes('preview') || subdomain.includes('docs-staging') ) {
		previewPath = uri.split('/').slice(0,3).join('/');
		uri = uri.replace(previewPath, '');
		logMsg += `Preview path is ${ previewPath }, URI set to: ${ uri } `;
	}

	if ( subMatch.length ) {
		// order of precedence: url > cookie > header
		if ( params['lang_pref'] && allowedLanguages.indexOf(params['lang_pref']) !== -1 ) {
			acceptLanguage = params['lang_pref'];

			logMsg += `Change acceptLanguage based on URL Param: ${ acceptLanguage }`;

			console.log(`Log Msg 60: ${ logMsg }; Accept-Language: ${ acceptLanguage }; curLang: ${ curLang }; origin: ${ window.location.origin }; URI: ${ uri }`);

			Cookies.set("lang_pref", acceptLanguage, {path: cookiePath});
			if ( curLang !== acceptLanguage ) {
				window.location.replace( window.location.origin + `${ previewPath }/${ uri }`.replace(/\/+/g,'/') );
			}
		}
		else if (Cookies.get('lang_pref') && allowedLanguages.indexOf(Cookies.get('lang_pref')) !== -1 ) {
			acceptLanguage = Cookies.get('lang_pref');
			logMsg += `Change acceptLanguage based on lang_pref Cookie: ${ acceptLanguage}`;
		}
		else if ( subMatch.length && redirectLanguages.indexOf(supportedLanguage) !== -1 ) {
			logMsg += `Set acceptLanguage based on navigator.language header value: ${  supportedLanguage  } ; DEBUG: ${ supportedLanguage.startsWith('ja') }`;

			acceptLanguage = redirectLanguages.filter(lang => supportedLanguage.match(lang)).toString();
		}

		if ( !uri.includes(`/${ acceptLanguage }/`) ) {
			if (acceptLanguage === 'en') {
				logMsg += '; desired language not in URL, but dest is `EN` so this is OK';
			}
			else {
				const dest = `${ previewPath }/${ acceptLanguage }/${ uri.replace(curLang, '') }`.replace(/\/+/g,'/');

				logMsg += `; acceptLanguage ${ acceptLanguage } not in URL, triggering redirect to ${ dest }`;

				console.log(`Log Msg 84: ${ logMsg }; Accept-Language: ${ acceptLanguage }`);

				Cookies.set("lang_pref", acceptLanguage, {path: cookiePath});
				window.location.replace( dest );
			}
		}

		/* eslint no-unused-expressions: "off", no-undef: "off" */
		window.DD_LOGS && DD_LOGS.logger.debug(logMsg, { requested_url: baseURL, subdomain, uri, acceptLanguage });
		// debug ? console.log(logMsg) : '';
	}
}

window.addEventListener('load', handleLanguageBasedRedirects, false);