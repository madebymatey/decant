export type BridgeProduct = {
    id: string
    title: string
    subTitle?: string | null
    slug: string
    image?: string | null

    available: boolean
    webStatus?: string | null
    adminStatus?: string | null

    priceCents?: number | null
    compareAtCents?: number | null
    priceLabel?: string | null

    type?: string | null
    department?: { id: string; title: string; code?: string | null } | null

    teaser?: string | null
    seo?: { title?: string | null; description?: string | null } | null

    wine?: {
        vintage?: number | null
        varietal?: string | null
        type?: string | null
        region?: string | null
        appellation?: string | null
        countryCode?: string | null
    } | null

    collections?: { id: string; title: string; slug?: string | null }[]
}

type C7Product = any

function pickImage(p: C7Product): string | null {
    return p?.image ?? p?.images?.[0]?.src ?? null
}

function pickVariant(p: C7Product) {
    const v = p?.variants?.[0]
    if (!v) return null
    return {
        price: typeof v.price === "number" ? v.price : null,
        comparePrice: typeof v.comparePrice === "number" ? v.comparePrice : null,
    }
}

function formatPrice(cents?: number | null) {
    if (typeof cents !== "number") return null
    return `$${(cents / 100).toFixed(2)}`
}

export function mapC7Product(p: C7Product): BridgeProduct {
    const variant = pickVariant(p)
    const available = String(p?.webStatus ?? "").toLowerCase() === "available"

    return {
        id: String(p?.id ?? ""),
        title: String(p?.title ?? ""),
        subTitle: p?.subTitle ?? null,
        slug: String(p?.slug ?? ""),
        image: pickImage(p),

        available,
        webStatus: p?.webStatus ?? null,
        adminStatus: p?.adminStatus ?? null,

        priceCents: variant?.price ?? null,
        compareAtCents: variant?.comparePrice ?? null,
        priceLabel: formatPrice(variant?.price ?? null),

        type: p?.type ?? null,
        department: p?.department
            ? {
                id: String(p.department.id ?? ""),
                title: String(p.department.title ?? ""),
                code: p.department.code ?? null,
            }
            : null,

        teaser: p?.teaser ?? null,
        seo: p?.seo
            ? { title: p.seo.title ?? null, description: p.seo.description ?? null }
            : null,

        wine: p?.wine
            ? {
                vintage: typeof p.wine.vintage === "number" ? p.wine.vintage : null,
                varietal: p.wine.varietal ?? null,
                type: p.wine.type ?? null,
                region: p.wine.region ?? null,
                appellation: p.wine.appellation ?? null,
                countryCode: p.wine.countryCode ?? null,
            }
            : null,

        collections: Array.isArray(p?.collections)
            ? p.collections.map((c: any) => ({
                id: String(c.id ?? ""),
                title: String(c.title ?? ""),
                slug: c.slug ?? null,
            }))
            : [],
    }
}