/**
 * 甜甜香气 / Sweet Scent — 执行组织。
 *
 * 核心念头：朝选定的点吐出一团甜香，香气落地摊成一片会停留的云；云里的人被香气浸透，
 *   躲不掉、藏不住——之后任何来源打在它身上的伤害都被放大，这就是「大幅降低闪避率」在即时交战里的样子。
 *
 * 出手：短起手（windup 在施法者嘴边聚起金色香息）后提交，按配置决定香气铺得多开、留得多浓。
 * 云：WorldEffects.field 的甜云（规则 world_combat:field/sweetscent 定义在本单元）每 5 刻扫一次，
 *     罩住范围内的非友方，按节流挂共享身份 world_combat:status/scented，强度写进效果等级。
 * 易伤：MobEffects.reactTagged 监听 world_combat:damage_incoming；目标带着身份时，按等级放大来犯伤害。
 * 反制：走出云外留香会自然走完；云有存在时长；只放大伤害，不造成伤害，也不阻止对方离场。
 */
namespace PokemonSkills {
    function sweetscentCentre(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 一个身处甜云中的战斗者：按当前状态挂上「浸透」，并按 refresh 节流，避免每 5 刻重挂一次。 */
    function sweetscentExpose(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, fresh: boolean): boolean {
        if (world.friendly(actor)) return false;
        const ref = String(actor.ref()), next = field.data.next || (field.data.next = {}), now = world.tick();
        if (!fresh && now < (next[ref] || 0)) return false;
        const first = next[ref] === undefined;
        next[ref] = now + Math.max(10, Math.round(field.data.refresh || 40));
        const rank = Math.max(1, Math.min(3, Math.round(field.data.rank || 1)));
        const ticks = Math.max(40, Math.round(field.data.scent || 120));
        MobEffects.apply(world, actor, sweetscentEffect, ticks, rank - 1);
        const body = world.observe(actor);
        if (body !== null) {
            WorldFeedback.emit(world, sweetscentScene, 1, body.position(),
                { moment: "scented", target: ref, rank: rank, scale: 1 + rank * 0.2 }, 24);
            if (first) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)),
                "world_combat.move.sweetscent.text.scented", [rank], 30);
        }
        return true;
    }

    // 甜云的行为：续播画面、按节流给范围内的非友方留香。规则登记一次，全场共用。
    WorldEffects.fieldRule(sweetscentField, {
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            if (!(field.data && typeof field.data.rank === "number")) return;
            const centre = sweetscentCentre(field), radius = field.radius, scale = radius / 2.2;
            WorldFeedback.keep(world, "sweetscent:cloud", sweetscentScene, 1, centre,
                { moment: "cloud", scale: scale, rank: field.data.rank }, 40);
            const actors = world.query(centre, radius, false);
            const cap = Math.max(1, Math.round(field.data.maxTargets || 3));
            let applied = 0;
            for (let i = 0; i < actors.length && applied < cap; i++) {
                const actor = actors[i];
                if (!world.valid(actor)) continue;
                const body = world.observe(actor);
                if (body === null || !world.clear(centre, body.position())) continue;
                if (sweetscentExpose(world, actor, field, false)) applied++;
            }
        }
    });

    // 被香气浸透：任何来源打在这个目标上的伤害按浸透等级放大。身份由别的单元也能产出，这里只按 tag 读。
    MobEffects.reactTagged("world_combat:move_sweetscent/vulnerable", sweetscentSpot, "world_combat:damage_incoming",
        function (event) { return event.target(); },
        function (event, _actor, effect) {
            const data = JSON.parse(String(event.data()));
            if (!(data.amount > 0) || data.bypassesInvulnerability) return;
            const rank = Math.max(1, effect.amplifier() + 1);
            data.amount = data.amount * (1 + rank * sweetscentRankBonus);
            event.data(JSON.stringify(data));
        });

    define({
        id: sweetscentId,
        cooldownParameter: "recharge",
        name: "甜甜香气",
        description: "朝选定地点吐出一片会停留的甜云；云里的人被香气浸透，之后任何来源打在它身上的伤害都被放大——躲不掉也藏不住。",
        uses: ["把一片区域变成易伤区", "配合队友集火一个被香气罩住的目标", "封住门口或通道"],
        kind: "point",
        range: 7,
        maxRange: 12,
        prepare: 10,
        active: 60,
        recover: 10,
        cooldown: 80,
        style: "aroma",
        defaults: { aroma: false },
        fields: [
            flag("aroma", "馥郁")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[sweetscentId], detail: { values: config }, world, actor, attributes };
            const rich = !!(config && config.aroma);
            return {
                prepare: Math.round(p(sweetscentId, "tempo", context)),
                recover: p(sweetscentId, "recover", context),
                cooldown: Math.round(p(sweetscentId, "recharge", context) * (rich ? 1.15 : 1)),
                active: 60,
                range: p(sweetscentId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("sweetscent-windup", sweetscentScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", aroma: config && config.aroma ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[sweetscentId], detail: { values: config } };
            return { radius: p(sweetscentId, "cloudRadius", context), geometry: "area", style: "aroma", label: "甜甜香气" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const centre = action.targetPosition(), origin = action.origin();
            const radius = Math.max(1.4, Math.min(3.6, p(sweetscentId, "cloudRadius", action)));
            const ticks = Math.max(100, Math.round(p(sweetscentId, "cloudTicks", action)));
            const scent = Math.max(100, Math.round(p(sweetscentId, "scentTicks", action)));
            const rank = Math.max(1, Math.min(3, Math.round(p(sweetscentId, "exposure", action))));
            const cap = Math.max(1, Math.round(p(sweetscentId, "maxTargets", action)));
            const delta = centre.minus(origin), distance = delta.length();
            const direction = distance < 0.01 ? action.direction() : delta.unit();
            const scale = radius / 2.2;
            sound(action, "minecraft:entity.bee.pollinate");
            WorldFeedback.emit(world, sweetscentScene, 1, origin,
                { moment: "release", direction: [direction.x(), direction.y(), direction.z()], distance: distance, scale: scale, rank: rank }, 30);
            WorldEffects.field(world, sweetscentField, centre, radius,
                { rank: rank, scent: scent, maxTargets: cap, refresh: 40, next: {} }, ticks);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 0.8, 0)), "world_combat.move.sweetscent.text.cloud", [], 28);
            done(action);
        }
    });
}
