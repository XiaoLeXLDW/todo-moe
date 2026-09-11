export type TodoMoeChannel = 'development' | 'stable';
export const todoMoeBrand: {
    name: string;
    version: string;
    androidPackage: string;
    scheme: string;
    repository: string;
    upstreamRepository: string;
    upstreamVersion: string;
    upstreamSha: string;
    upstreamRef: string;
    artworkStatus: string;
};
export function getTodoMoeIdentity(channel: TodoMoeChannel): {
    name: string;
    packageName: string;
    scheme: string;
    channel: TodoMoeChannel;
};
