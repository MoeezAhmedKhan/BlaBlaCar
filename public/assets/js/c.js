(function () {
    /**
     * Saves actual referrer to session storage
     * @return {void}
     */
    function saveReferrer() {
        try {
            window.sessionStorage.setItem('ddOriginalReferrer', document.referrer);
        } catch (error) {
            // Silently fails
        }
    }
    saveReferrer();

    var noScriptMessageElement = document.getElementById('cmsg');
    var noScriptMessageText = noScriptMessageElement ? noScriptMessageElement.innerText : '';
    var getRefererQueryParamString = function () {
        try {
            var prefix = '&referer=';
            if (window.location !== window.parent.location) {
                // Nested Iframe
                return prefix + encodeURIComponent(window.location.href);
            }
            return prefix + encodeURIComponent(window.parent.location.href);
        } catch (e) {
            return '';
        }
    };

    var isSafari = window.navigator
        ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
        : false;
    var stretchHeightRule = isSafari ? 'height: -webkit-fill-available;' : '';

    var getDDCookie = function (value) {
        var r = new RegExp('datadome=([^;]+)');
        var v = r.exec(value);
        if (v != null) {
            try {
                return decodeURIComponent(v[1]);
            } catch (e) {
                return v[1];
            }
        }
        return null;
    };

    function generateIframe(dd, noScriptMessageText, volatile, stretchHeightRule) {
        var isIframeLoaded = false;
        var maxTimeoutMs = 5000;

        function iframeOnload() {
            isIframeLoaded = true;
            var noIframeElem = document.getElementById('noiframe');
            if (noIframeElem) {
                noIframeElem.parentNode.removeChild(noIframeElem);
            }
        }

        if (
            typeof navigator.userAgent === 'string' &&
            navigator.userAgent.indexOf('Firefox') > -1
        ) {
            var initialTime = new Date().getTime();
            setTimeout(function () {
                if (!isIframeLoaded && new Date().getTime() - initialTime > maxTimeoutMs) {
                    document.body.innerHTML =
                        '<div id="noiframe">' +
                        noScriptMessageText +
                        '</div>' +
                        document.body.innerHTML;
                }
            }, maxTimeoutMs);
        }

        var iframeSrc =
            'https://' +
            dd.host +
            '/captcha/?initialCid=' +
            encodeURIComponent(dd.cid) +
            '&hash=' +
            encodeURIComponent(dd.hsh) +
            '&cid=' +
            encodeURIComponent(volatile ? window.ddcid : getDDCookie(document.cookie)) +
            '&t=' +
            encodeURIComponent(dd.t) +
            getRefererQueryParamString() +
            '&s=' +
            dd.s +
            '&e=' +
            dd.e +
            (dd.cp && dd.cp.name && dd.cp.value
                ? '&' + encodeURIComponent(dd.cp.name) + '=' + encodeURIComponent(dd.cp.value)
                : '');

        var iframeHTML =
            '<iframe src="' +
            iframeSrc +
            '" width="100%" height="100%" style="height:100vh;' +
            stretchHeightRule +
            '" FRAMEBORDER="0" border="0" scrolling="yes"' +
            '></iframe>';

        return { iframeHTML: iframeHTML, iframeOnload: iframeOnload };
    }
    var volatile = document.cookie === '' && window.ddcid != null;

    var iframeResult = generateIframe(dd, noScriptMessageText, volatile, stretchHeightRule);
    var iframeWrapper = document.createElement('div');
    iframeWrapper.innerHTML = iframeResult.iframeHTML;
    var iframeElem = iframeWrapper.firstChild;

    if (iframeElem) {
        iframeElem.addEventListener('load', iframeResult.iframeOnload);
    }

    document.body.appendChild(iframeElem);

    if (noScriptMessageElement) {
        noScriptMessageElement.parentNode.removeChild(noScriptMessageElement);
    }

    var canGoBack =
        window.history && typeof window.history.back === 'function' && window.history.length > 1;
    // `ddShouldGoBack` is an option that can be set by a code snippet in a customer's page customization.
    var shouldGoBack = (dd.r && dd.r === 'b' && canGoBack) || (window.ddShouldGoBack && canGoBack);

    var viewPortTag = document.createElement('meta');
    viewPortTag.name = 'viewport';
    viewPortTag.content = 'width=device-width, initial-scale=1.0';

    var headTag = document.querySelector('head');
    if (headTag != null) {
        headTag.appendChild(viewPortTag);
    }

    var onMessageCallback = function (event) {
        // Check if messages come from DataDome origins.
        function isDatadomeOrigin(url) {
            var ddHosts = ['.datado.me', '.captcha-delivery.com'];
            var scheme = 'https://';

            if (url.indexOf(scheme) !== 0) {
                return false;
            }

            var hostname = url.replace(scheme, '').split('/')[0];

            for (var i = 0; i < ddHosts.length; i++) {
                var ddHost = ddHosts[i];
                if (hostname.indexOf(ddHost, hostname.length - ddHost.length) !== -1) {
                    return true;
                }
            }

            return false;
        }

        function addSearchParam(url, name, value) {
            if (typeof window.URL === 'function') {
                var extendedUrl = new URL(url);
                extendedUrl.searchParams.set(name, value);

                return extendedUrl.href;
            }

            return url;
        }

        if (event.isTrusted && isDatadomeOrigin(event.origin)) {
            if (typeof event.data !== 'string') {
                return false;
            }

            try {
                var data = JSON.parse(event.data);

                if (data.eventType == 'load') {
                    return false;
                }

                if (data.cookie) {
                    document.cookie = data.cookie;
                }

                if (data.url) {
                    setTimeout(function () {
                        if (shouldGoBack) {
                            if (volatile && document.referrer.length > 0) {
                                window.location = addSearchParam(
                                    document.referrer,
                                    'ddcid',
                                    getDDCookie(data.cookie)
                                );
                            } else {
                                history.back();
                            }
                        } else {
                            if (volatile && typeof window.URL === 'function') {
                                window.location = addSearchParam(
                                    window.location.href,
                                    'ddcid',
                                    getDDCookie(data.cookie)
                                );
                            } else {
                                window.location.reload();
                            }
                        }
                    }, 500);
                }
            } catch (_) {
                /* Silent failure if JSON.parse is used on invalid data */
            }
        }
    };

    if (window.addEventListener) {
        window.addEventListener('message', onMessageCallback, false);
    } else if (window.attachEvent) {
        window.attachEvent('onmessage', onMessageCallback);
    }
})();
