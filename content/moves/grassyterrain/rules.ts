/**
 * 青草场地 / grassyterrain 的场地规则与属性结算，对所有战斗者一致。
 *
 * 草地是一条区域规则：每 5 刻扫描半径内、贴地（grounded）的活体，给他们补 `world_combat:grassyterrain_ground`
 * （身份 `world_combat:status/grassyterrain`）。带该身份的活体：草属性招式威力 ×1.3，地震与重踏威力减半；
 * 站上草地的活体按各自最大生命缓慢回复（对双方一视同仁，所以「趁对手满血时补自己」才有意义）。
 * 开启 blooming 时，草地每 20 刻照料附近一处可生长的植物，用完 growth 次为止。
 * 属性改写放在 `PokemonDamage.metadata`，结算前对任何来源的招式生效。
 */
namespace PokemonSkills {
    function grassyPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    function grassyTouch(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        var body = world.observe(actor);
        if (body === null || !body.grounded()) return false;
        MobEffects.apply(world, actor, grassyGround, Math.max(20, Math.round(Number(field.data.mark) || 24)), 0);
        return true;
    }

    function grassyRestore(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        var body = world.observe(actor);
        if (body === null || !body.grounded() || body.health() >= body.maxHealth()) return;
        var next = field.data.next || (field.data.next = {}), ref = String(actor.ref());
        if (world.tick() < (next[ref] || 0)) return;
        next[ref] = world.tick() + Math.max(12, Math.round(Number(field.data.interval) || 42));
        var missing = body.maxHealth() - body.health();
        var healed = world.health(actor, Math.min(missing, body.maxHealth() * (Number(field.data.ratio) || 0.0625)), "world_combat:grassyterrain");
        var now = world.observe(actor);
        if (healed <= 0 || now === null) return;
        var shown = Math.round(healed * 10) / 10;
        WorldFeedback.emit(world, grassyScene, 1, now.position(), { moment: "heal", target: ref, healed: shown }, 30);
        WorldFeedback.text(world, now.position().plus(WorldCombat.point(0, 1, 0)), grassyHealText, [shown], 30);
    }

    /** Blooming only: spend a bounded number of attempts tending real growable plants inside the grass. */
    function grassyTend(world: CombatWorld, field: WorldEffects.Field): void {
        if (!field.data.bloom) return;
        var budget = Math.max(0, Math.round(Number(field.data.growth) || 0));
        var used = field.data.used || 0;
        if (used >= budget || world.tick() < (field.data.nextTend || 0)) return;
        field.data.nextTend = world.tick() + 20;
        var sites = WorldCultivation.sites(world, grassyPoint(field), Math.min(4, field.radius));
        if (!sites.length) return;
        var site = sites[Math.floor(world.random() * sites.length)];
        var result = WorldCultivation.use(world, site);
        if (result !== "changed" && result !== "used") return;
        field.data.used = used + 1;
        var at = WorldCombat.point(site.point[0] + 0.5, site.point[1] + 0.5, site.point[2] + 0.5);
        WorldFeedback.emit(world, grassyScene, 1, at, { moment: "growth" }, 30);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 0.7, 0)), grassyGrowthText, [], 30);
    }

    WorldEffects.fieldRule(grassyField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!grassyTouch(world, actor, field)) return;
            var body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, grassyScene, 1, body.position(), { moment: "root", target: String(actor.ref()) }, 20);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            grassyTouch(world, actor, field);
            grassyRestore(world, actor, field);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            var centre = grassyPoint(field);
            WorldFeedback.keep(world, "world_combat:move_grassyterrain/field/" + effect.id(), grassyScene, 1, centre,
                { moment: "field", density: field.data.density || 26, scale: field.radius / 3 }, 20);
            grassyTend(world, field);
        }
    }, { identity: WorldEffects.terrain("grassyterrain"), tags: [WorldEffects.categories.terrain] });

    PokemonDamage.metadata.define({ id: "world_combat:move_grassyterrain/power", apply: function (context) {
        if (!context.world || !context.actor || !(context.metadata.power > 0)) return;
        if (!CombatStatus.has(context.world, context.actor, "grassyterrain")) return;
        var type = String(context.metadata.type).toLowerCase(), move = String(context.metadata.move);
        if (type === "grass") context.metadata.power *= 1.3;
        if (move === "earthquake" || move === "bulldoze") context.metadata.power *= 0.5;
    } });
}
