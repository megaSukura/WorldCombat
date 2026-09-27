/**
 * 玩水 / watersport 的水洼规则与火焰结算，对所有战斗者一致。
 *
 * 水洼是一条区域规则：每 5 刻扫描半径内的活体，不分敌我地给他们补 world_combat:watersport_soaked
 *   （身份 world_combat:status/watersport 是本招的机读键，world_combat:status/soaked 是共享的「湿」身份，
 *   别的单元可以只问湿没湿）。每个活体收到的是一份**来源贡献**，payload 记下它所在水洼的 fireFactor；
 *   火招削弱按这份贡献取系数，而不是去看世界上所有水洼取一个全局最小值——站哪片洼就按哪片算，不借远处的强洼。
 *   结算是先取本人实际收到的贡献，再在 PokemonDamage.metadata 里改写，改完进入本系、相性与特性。
 *   明火与灼伤分开：原生真实身火直接 ignite 0 浇灭，burn 身份另行 cure，没有 burn 的普通灼烧也会被灭。
 *   水洼每轮还按 quench 预算检查地面格，把野火 breakBlock 掉——火是消耗品，灭掉就不会自己烧回来。
 */
namespace PokemonSkills {
    StatusContributions.define(watersportEffect);

    function watersportPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 原生事实：这个活体现在真的在燃烧（不限于 burn 状态）。 */
    function watersportBurningBody(world: CombatWorld, actor: CombatActor): boolean {
        const native: { isOnFire(): boolean } | null = world.nativeEntity(actor);
        return native !== null && native.isOnFire();
    }

    function watersportSoak(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        const body = world.observe(actor);
        if (body === null) return false;
        const ticks = Math.max(40, Math.round(Number(field.data.wet) || 80)) + 20;
        // 余湿带来源：payload 记下本人所处水洼的 fireFactor，离开后仍按这条贡献算，直到它到期。
        const id = StatusContributions.upsert(world, actor, watersportEffect, String(field.id), { fire: field.data.fire }, ticks,
            { owner: { id: field.id!, definition: "world_combat:field", target: String(world.source().ref()) } });
        // 明火与灼伤是两件事：先把真实身火浇灭，再单独净化 burn 身份。
        const doused = watersportBurningBody(world, actor) && world.ignite(actor, 0);
        const cured = CombatStatus.cure(world, actor, "burn");
        if (doused) WorldFeedback.emit(world, watersportScene, 1, body.position(), { moment: "douse", target: String(actor.ref()) }, 26);
        if (doused || cured) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), watersportDouseText, [], 26);
        return id > 0;
    }

    /** 有界地走格子：每轮扫描在水洼里取几格，把明火沤熄。 */
    function watersportQuench(world: CombatWorld, field: WorldEffects.Field): void {
        const centre = watersportPoint(field), budget = Math.max(1, Math.round(Number(field.data.quench) || 5));
        const base = Math.floor(centre.y());
        for (let i = 0; i < budget; i++) {
            const angle = world.random() * Math.PI * 2, distance = Math.sqrt(world.random()) * field.radius;
            const x = Math.floor(centre.x() + Math.cos(angle) * distance), z = Math.floor(centre.z() + Math.sin(angle) * distance);
            for (let dy = -1; dy <= 1; dy++) {
                const point = WorldCombat.point(x + 0.5, base + dy + 0.5, z + 0.5), block = world.block(point);
                if (block === null) continue;
                const id = String(block.id());
                if (id !== "minecraft:fire" && id !== "minecraft:soul_fire") continue;
                if (world.breakBlock(point, false) !== "") continue;
                WorldFeedback.emit(world, watersportScene, 1, point, { moment: "douse" }, 20);
                break;
            }
        }
    }

    WorldEffects.fieldRule(watersportField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!watersportSoak(world, actor, field)) return;
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, watersportScene, 1, body.position(),
                { moment: "drench", target: String(actor.ref()), density: field.data.density || 20, fire: field.data.fire }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), watersportDrenchText, [], 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            watersportSoak(world, actor, field);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = watersportPoint(field);
            WorldFeedback.keep(world, "world_combat:move_watersport/field/" + effect.id(), watersportScene, 1, centre,
                { moment: "field", density: field.data.density || 20, scale: field.radius / 3.2 }, 20);
            watersportQuench(world, field);
        }
    });

    // 泡湿者的火招被压：只取本人实际收到的水洼贡献（不越过周身看别处的水洼），威力乘上其中最低的 fire。
    PokemonDamage.metadata.define({ id: "world_combat:move_watersport/dampen", apply: function (context) {
        if (!context.world || !context.actor || !(context.metadata.power > 0)) return;
        if (String(context.metadata.type).toLowerCase() !== "fire") return;
        const coats = StatusContributions.list(context.world, context.actor, watersportEffect);
        if (!coats.length) return;
        let factor = 1;
        for (let i = 0; i < coats.length; i++) {
            const value = Number(coats[i].payload && coats[i].payload.fire);
            if (isFinite(value) && value > 0 && value < factor) factor = value;
        }
        if (factor < 1) context.metadata.power *= factor;
    } });
}
