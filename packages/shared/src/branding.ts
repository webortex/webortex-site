/**
 * Centralised branding for the Mobility Media product.
 *
 * Nothing in the platform may hard-code a product name, tagline, logo or contact
 * address. Everything renders through this object so the product can be renamed,
 * white-labelled or resold to a franchise operator without touching view code.
 *
 * Values may be overridden at build time from Vite env vars (see
 * `packages/shared/src/branding-env.ts`) which keeps secrets and per-deployment
 * URLs out of source control.
 */

export interface BrandingCopy {
  readonly productName: string;
  readonly shortName: string;
  readonly parentBrand: string;
  readonly networkName: string;
  readonly tagline: string;
  readonly positioning: string;
  readonly supportingMessage: string;
  readonly description: string;
  readonly currency: string;
  readonly currencySymbol: string;
  readonly locale: string;
  readonly timezone: string;
  readonly primaryCta: { readonly label: string; readonly href: string };
  readonly secondaryCta: { readonly label: string; readonly href: string };
  readonly contactEmail: string;
  readonly supportEmail: string;
  readonly supportPhone: string;
  readonly legalEntity: string;
}

export interface BrandingIdentity {
  readonly logoPath: string;
  readonly wordmarkPath: string;
  readonly ogImagePath: string;
  readonly markLabel: string;
}

export interface Branding {
  readonly copy: BrandingCopy;
  readonly identity: BrandingIdentity;
  readonly site: {
    readonly baseUrl: string;
    readonly namespace: string;
    readonly appOrigins: readonly string[];
  };
}

/** Default branding. Overridden by `buildBranding()` when env vars are present. */
export const DEFAULT_BRANDING: Branding = {
  copy: {
    productName: "Webortex Mobility Media",
    shortName: "Mobility Media",
    parentBrand: "Webortex",
    networkName: "Webortex Mobility Network",
    tagline: "Turn Every Ride Into a Measurable Advertising Opportunity.",
    positioning:
      "A technology-powered mobility advertising network connecting advertisers, drivers, passengers and digital screens.",
    supportingMessage:
      "Buy attention where it cannot be skipped, then prove it with attributed leads, coupon redemptions and revenue.",
    description:
      "Mobility Media is a multi-tenant advertising, vehicle screen, campaign and revenue platform. Advertisers run measurable campaigns, drivers earn from the screens in their vehicles, and the platform attributes every play, interaction and conversion back to a campaign, a screen, a zone and a timestamp.",
    currency: "INR",
    currencySymbol: "\u20B9",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    primaryCta: { label: "Start an advertiser account", href: "/mobility-media/register?type=advertiser" },
    secondaryCta: { label: "Join as a vehicle owner", href: "/mobility-media/register?type=driver" },
    contactEmail: "mobility@webortex.com",
    supportEmail: "support@webortex.com",
    supportPhone: "+91-7672024001",
    legalEntity: "Webortex",
  },
  identity: {
    logoPath: "/logo.png",
    wordmarkPath: "/logo2.png",
    ogImagePath: "/logo2.png",
    markLabel: "MM",
  },
  site: {
    baseUrl: "https://www.webortex.com",
    namespace: "/mobility-media",
    appOrigins: ["https://www.webortex.com", "https://webortex.com"],
  },
};

interface BrandingOverrides {
  productName?: string;
  shortName?: string;
  tagline?: string;
  baseUrl?: string;
  contactEmail?: string;
  supportEmail?: string;
  supportPhone?: string;
  currency?: string;
  legalEntity?: string;
}

/** Merge partial overrides onto the defaults. Empty strings are ignored. */
export function buildBranding(overrides: BrandingOverrides = {}): Branding {
  const pick = (value: string | undefined, fallback: string): string =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;

  return {
    copy: {
      ...DEFAULT_BRANDING.copy,
      productName: pick(overrides.productName, DEFAULT_BRANDING.copy.productName),
      shortName: pick(overrides.shortName, DEFAULT_BRANDING.copy.shortName),
      tagline: pick(overrides.tagline, DEFAULT_BRANDING.copy.tagline),
      contactEmail: pick(overrides.contactEmail, DEFAULT_BRANDING.copy.contactEmail),
      supportEmail: pick(overrides.supportEmail, DEFAULT_BRANDING.copy.supportEmail),
      supportPhone: pick(overrides.supportPhone, DEFAULT_BRANDING.copy.supportPhone),
      currency: pick(overrides.currency, DEFAULT_BRANDING.copy.currency),
      legalEntity: pick(overrides.legalEntity, DEFAULT_BRANDING.copy.legalEntity),
    },
    identity: DEFAULT_BRANDING.identity,
    site: {
      ...DEFAULT_BRANDING.site,
      baseUrl: pick(overrides.baseUrl, DEFAULT_BRANDING.site.baseUrl).replace(/\/+$/, ""),
    },
  };
}

/** Absolute URL helper so canonical/OG tags are always correct regardless of host. */
export function absoluteUrl(branding: Branding, path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${branding.site.baseUrl}${suffix === "/" ? "" : suffix}`;
}