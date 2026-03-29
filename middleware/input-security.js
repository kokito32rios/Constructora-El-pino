function stripHtml(value) {
    return value
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function sanitizeValue(value) {
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item));
    }

    if (value && typeof value === 'object') {
        return Object.keys(value).reduce((result, key) => {
            result[key] = sanitizeValue(value[key]);
            return result;
        }, {});
    }

    if (typeof value === 'string') {
        return stripHtml(value);
    }

    return value;
}

function sanitizeRequest(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body);
    }

    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeValue(req.query);
    }

    if (req.params && typeof req.params === 'object') {
        req.params = sanitizeValue(req.params);
    }

    next();
}

module.exports = {
    sanitizeRequest
};
