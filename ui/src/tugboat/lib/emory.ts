/**
 * Emory is a Skiff hosted key-value store that's exposed via a public HTTP API.
 *
 * See: https://github.com/allenai/emory
 */
export namespace emory {
    type AppId = string;
    type DocId = string;
    type Doc<T extends {}> = T;

    interface Entry<T> {
        app: AppId;
        type?: string;
        doc: Doc<T>;
    }

    /**
     * Emory returns a URL path when an item is created, i.e. `/d/:id`. We strip `/d/` so that
     * the caller only gets the id back.
     */
    function removePrefix(url: string): DocId {
        return url.replace(/^\/d\//, '');
    }

    const origin = 'https://emory.apps.allenai.org';

    /**
     * Creates a document and returns the resulting id.
     */
    export function createDoc<T>(entry: Entry<T>): Promise<DocId> {
        return fetch(`${origin}/api/v1/document/`, {
            method: 'POST',
            body: JSON.stringify(entry),
        })
            .then((r) => r.text())
            .then((url) => removePrefix(url));
    }

    /**
     * Retrieves a document by it's id.
     */
    export function getDoc<T>(id: DocId): Promise<Entry<T>> {
        return fetch(`${origin}/d/${id}`).then((r) => {
            if (!r.ok) {
                return r.text();
            }
            return r.json();
        });
    }

    class InvalidDocError extends Error {
        constructor(field: string & keyof Entry<any>, actual: string, expected: string) {
            super(`Returned doc had ${field} "${actual}" but "${expected}" was expected.`);
        }
    }

    /**
     * Retrieves a document by it's id. If the returned document doesn't belong to the provided
     * application or have the provided type, an error is thrown.
     */
    export function getDocStrict<T>(id: DocId, app: string, type?: string): Promise<Entry<T>> {
        return getDoc<T>(id).then((e) => {
            if (e.app !== app) {
                return Promise.reject(new InvalidDocError('app', e.app, app));
            }
            if (type && e.type !== type) {
                return Promise.reject(new InvalidDocError('type', `${e.type}`, type));
            }
            return e;
        });
    }

    /**
     * If a backwards incompatible change is made to the input or output, you can invalidate
     * all previously shared links (and the data associated with them) by changing the value
     * of Version below.
     *
     * A unique version is used in non-production environments to segment this data from data
     * produced by actual users.
     */
    const isProduction = process.env.NODE_ENV === 'production';
    const envSuffix = !isProduction ? '-dev' : '';
    export const getVersion = (taskIdWithVersion: string) => taskIdWithVersion + envSuffix;
}
