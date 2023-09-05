export default class Page {
    options;
    constructor(options) {
        this.options = options;
    }
    merge(other) {
        const data = structuredClone(this.options.data);
        Object.keys(other.options.data).forEach((key) => {
            if (!data[key]) {
                data[key] = other.options.data[key];
            }
        });
        return new Page({
            ...this.options,
            data
        });
    }
    toJSON() {
        return this.options;
    }
}
