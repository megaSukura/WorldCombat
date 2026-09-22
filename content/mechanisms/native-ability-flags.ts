/**
 * Native ability markers read from the installed Cobblemon data/cobblemon/showdown.zip (data/abilities.js).
 *
 * A pure data fallback: independent ability content overrides any key by declaring it on its own trait
 * (NativeAbilities.property reads a content trait first and only then this table). Keys cover the flags the
 * world-combat consumers actually ask for:
 *   failroleplay  Role Play / Doodle cannot copy this ability.
 *   cantsuppress  Gastro Acid / Simple Beam / Worry Seed cannot suppress or overwrite it.
 *   typeLock      The ability itself owns the user's type (Multitype, RKS System); external
 *                 type rewrites are refused (NativeModifiers.typeLocked).
 * Other Showdown flags (noreceiver/noentrain/notrace/failskillswap/notransform) are kept for future consumers.
 */
namespace NativeAbilityFlags {
    export var data: { [id: string]: { [key: string]: boolean } } = {
        "asoneglastrier": {"failroleplay":true,"cantsuppress":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "asonespectrier": {"failroleplay":true,"cantsuppress":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "battlebond": {"failroleplay":true,"cantsuppress":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "comatose": {"failroleplay":true,"cantsuppress":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "commander": {"failroleplay":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "disguise": {"failroleplay":true,"cantsuppress":true,"notransform":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "embodyaspectcornerstone": {"failroleplay":true,"notransform":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "embodyaspecthearthflame": {"failroleplay":true,"notransform":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "embodyaspectteal": {"failroleplay":true,"notransform":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "embodyaspectwellspring": {"failroleplay":true,"notransform":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "flowergift": {"failroleplay":true,"noreceiver":true,"noentrain":true,"notrace":true},
        "forecast": {"failroleplay":true,"noreceiver":true,"noentrain":true,"notrace":true},
        "gulpmissile": {"cantsuppress":true,"notransform":true},
        "hungerswitch": {"failroleplay":true,"notransform":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "iceface": {"failroleplay":true,"cantsuppress":true,"notransform":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "illusion": {"failroleplay":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "imposter": {"failroleplay":true,"noreceiver":true,"noentrain":true,"notrace":true},
        "multitype": {"failroleplay":true,"cantsuppress":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true,"typeLock":true},
        "neutralizinggas": {"failroleplay":true,"notransform":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "poisonpuppeteer": {"failroleplay":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "powerconstruct": {"failroleplay":true,"cantsuppress":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "powerofalchemy": {"failroleplay":true,"noreceiver":true,"noentrain":true,"notrace":true},
        "protosynthesis": {"failroleplay":true,"notransform":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "quarkdrive": {"failroleplay":true,"notransform":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "receiver": {"failroleplay":true,"noreceiver":true,"noentrain":true,"notrace":true},
        "rkssystem": {"failroleplay":true,"cantsuppress":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true,"typeLock":true},
        "schooling": {"failroleplay":true,"cantsuppress":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "shieldsdown": {"failroleplay":true,"cantsuppress":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "stancechange": {"failroleplay":true,"cantsuppress":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "teraformzero": {"failroleplay":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "terashell": {"failroleplay":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "terashift": {"failroleplay":true,"cantsuppress":true,"notransform":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "trace": {"failroleplay":true,"noreceiver":true,"noentrain":true,"notrace":true},
        "wonderguard": {"failroleplay":true,"noreceiver":true,"noentrain":true,"failskillswap":true},
        "zenmode": {"failroleplay":true,"cantsuppress":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true},
        "zerotohero": {"failroleplay":true,"cantsuppress":true,"notransform":true,"noreceiver":true,"noentrain":true,"notrace":true,"failskillswap":true}
    };
}
if (typeof NativeAbilities !== "undefined") NativeAbilities.provideFlags(NativeAbilityFlags.data);
