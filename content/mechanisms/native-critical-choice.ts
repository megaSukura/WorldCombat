/** Finite critical offers are chosen under a real receipt before the native hurt/modifier chain. */
namespace CriticalChoices {
    function reserve(world: CombatWorld, source: CombatActor, data: any, offers: PokemonDamage.CriticalOffer[]): boolean {
        for (let i = 0; i < offers.length; i++) {
            const offer = offers[i];
            if (offer.actor !== String(source.ref())) continue;
            if (DamageBudgets.reserve({ world, data }, [{ actor: source, id: offer.id }])) return true;
        }
        return false;
    }
    WorldCombat.on("world_combat:critical_choices/resolution", "world_combat:damage_prepare", "", event => {
        const target = event.target(); if (!target) return;
        const hit: DamageSemantics.Incoming = { world: event.world(), source: event.actor(), target,
            data: JSON.parse(event.data()) };
        const choice = hit.data.criticalChoice;
        if (!choice) return;
        delete hit.data.criticalChoice;
        hit.data.amount = choice.ordinaryAmount;
        event.data(JSON.stringify(hit.data));
        if (choice.source !== String(hit.source.ref()) || choice.target !== String(hit.target.ref())
            || !choice.forced || !(choice.forced.amount > 0) || !Array.isArray(choice.offers)) return;
        if (!PokemonDamage.criticalAllowed(hit.world, hit.source, hit.target, hit.data)) return;
        if (!reserve(hit.world, hit.source, hit.data, choice.offers)) return;
        // Host provenance and receipt fields remain on the live data; the complete precomputed branch
        // replaces only authored resolution fields, before downstream protections see this amount.
        Object.keys(choice.forced.data).forEach(key => hit.data[key] = choice.forced.data[key]);
        hit.data.amount = choice.forced.amount;
        event.data(JSON.stringify(hit.data));
    });
    /** Called only by the prepared main-hurt receipt of a real Player.attack, before native event listeners. */
    WorldCombat.on("world_combat:critical_choices/native", "world_combat:critical_prepare", "", event => {
        const target = event.target(), world = event.world(), source = event.actor(), data = JSON.parse(event.data());
        if (!target || data.prepared !== true || !data.receiptId || world.damageReceipt() !== data.receiptId) return;
        const offers = PokemonDamage.offeredCriticals(world, source, target, data);
        if (!reserve(world, source, data, offers)) return;
        if (!data.critical) data.multiplier = Math.max(1.5, Number(data.multiplier) || 1);
        data.critical = true;
        data.criticalPrepared = true;
        event.data(JSON.stringify(data));
    });
}
