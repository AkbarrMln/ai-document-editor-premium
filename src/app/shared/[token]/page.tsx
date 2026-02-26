import SharedDocumentView from './SharedDocumentView'

interface PageProps {
    params: Promise<{ token: string }>
}

export default async function SharedPage(props: PageProps) {
    const params = await props.params
    return <SharedDocumentView token={params.token} />
}

export async function generateMetadata(props: PageProps) {
    const params = await props.params
    return {
        title: `Shared Document — ${params.token.slice(0, 6)}...`,
        description: 'Shared document via AI Document Editor',
    }
}
