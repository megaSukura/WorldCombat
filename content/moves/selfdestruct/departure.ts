namespace SelfdestructDeparture {
    export function point(raw: number[]): CombatPoint { return WorldCombat.point(raw[0], raw[1], raw[2]); }
    export function inside(region: WorldGeometry.Region, body: CombatObservation): boolean {
        const at = body.position();
        return region.contains(at) || region.contains(WorldCombat.point(at.x(), body.boundsMin().y(), at.z()))
            || region.contains(WorldCombat.point(at.x(), body.boundsMax().y(), at.z()));
    }
    /** Resolve while the payer still owns its stats, allegiance and action metadata. */
    export function damage(action: CombatAction, id: string, segment: string, centre: CombatPoint,
                           radius: number, band: number, cap: number, power: number): any[] {
        const world = action.world(), found: any[] = [];
        WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: band, above: band }), (target, facts) => {
            if (!world.clear(centre, facts.position())) return;
            const extra: any = PokemonSkills.damageFeatures(id, segment);
            extra.power = power; extra.damage = PokemonSkills.damageSpec(id, segment); extra.knockback = false;
            NativeLoadout.hitMetadata(action, extra);
            const hit = PokemonDamage.resolve(world, action.actor(), target, CobblemonCombat.moveTemplate(id), extra, action.id(), action);
            if (hit.amount > 0) found.push({ ref: String(target.ref()), amount: hit.amount, metadata: hit.metadata,
                distance: facts.position().minus(centre).length() });
        });
        found.sort((a, b) => a.distance - b.distance || (a.ref < b.ref ? -1 : 1));
        return found.slice(0, cap);
    }
}
