/**
 * 烟幕 / Smokescreen — 执行组织。
 *
 * 核心念头：朝一个地点吐出一团会前进的烟；烟团飞到落点、或撞上障碍时才绽成一片停留的云。
 *   云留在那里，谁站在里面谁就打不准；既能铺在对手脚下，也能铺在自己身前遮出一片烟换一口气。
 *
 * 出手：短起手（windup 在口边聚烟）后提交；浓烟与薄烟在覆盖与持久之间取舍。
 * 飞行：提交后从口边放出一团无伤烟团（LivingActions.projectile），飞行时长由 smokeSpeed 真实决定；
 *       烟团穿过生物，撞到方块就在撞点开云，走到落点就在落点开云——它不会穿墙瞬开，目标在烟到达前不会被呛。
 * 云：WorldEffects.field 的烟云（规则 world_combat:field/smokescreen 定义在本单元）每 5 刻扫一次，
 *     罩住范围内的非友方，按节流挂共享身份 world_combat:status/smoked，进入时下降原生命中等级；
 *     云的画面用 WorldFeedback.onEffect 绑在这片场地效果上，驱散或到期立刻停，不残留。
 * 反制：烟团要飞、云有存在时长且不会移动；走出云外余味会自然走完；铺云要选好落点，铺空了就白费一次冷却。
 */
namespace PokemonSkills {
    function smokescreenCentre(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    // 烟云的行为：续播画面、按节流给范围内的非友方上「呛眼」。规则登记一次，全场共用。
    WorldEffects.fieldRule(smokescreenField, {
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            if (!(field.data && typeof field.data.stage === "number")) return;
            const centre = smokescreenCentre(field), radius = field.radius;
            const density = Math.max(20, Math.round(field.data.density || 40));
            const scale = radius / 2.1;
            // 云的存在由这片场地效果自身决定：绑在它的 id 上，驱散或到期立刻停，不另算一份时长。
            if (typeof field.id !== "number" || !WorldFeedback.onEffect(world, field.id, "smokescreen:cloud", smokescreenScene, 1, centre,
                { moment: "cloud", scale: scale, density: density, radius: radius }))
                WorldFeedback.keep(world, "smokescreen:cloud", smokescreenScene, 1, centre,
                    { moment: "cloud", scale: scale, density: density, radius: radius }, 40);
            const stage = Math.max(1, Math.round(field.data.stage));
            const linger = Math.max(40, Math.round(field.data.linger || 70));
            const actors = world.query(centre, radius, false);
            const next = field.data.next || (field.data.next = {});
            const now = world.tick();
            for (let i = 0; i < actors.length; i++) {
                const actor = actors[i];
                if (!world.valid(actor) || world.friendly(actor)) continue;
                const body = world.observe(actor);
                if (body === null || !world.clear(centre, body.position())) continue;
                const ref = String(actor.ref());
                if (now < (next[ref] || 0)) continue;
                next[ref] = now + Math.max(10, Math.round(field.data.refresh || 20));
                const fresh = !CombatStatus.has(world, actor, smokescreenSpot);
                if (MobEffects.apply(world, actor, smokescreenEffect, linger, 0) === null) continue;
                if (fresh) {
                    NativeEffects.boost(world, actor, "accuracy", -stage);
                    WorldFeedback.emit(world, smokescreenScene, 1, body.position(),
                        { moment: "choked", target: ref }, 28);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.05, 0)),
                        "world_combat.move.smokescreen.text.choke", [stage], 34);
                }
            }
        }
    }, { tags: [WorldEffects.categories.haze] });

    define({
        id: smokescreenId,
        cooldownParameter: "recharge",
        name: "烟幕",
        description: "朝一个地点吐出一团会前进的烟；它飞到落点或撞上障碍时才绽成一片停留的烟云。站在云里的敌人命中下降、攻击变弱，走出云后还带着一段余味。云留在原地，可以罩住对手，也可以铺在自己身前遮出一片烟。",
        uses: ["把对手罩进一片打不准的烟云里", "铺在身前遮出一片烟，换一口气或撤退", "封住门口与走廊"],
        kind: "point",
        range: 8,
        maxRange: 12,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 150,
        style: "smoke",
        defaults: { density: "thick" },
        fields: [
            choice("density", "烟量", ["thick", "thin"], ["浓烟", "薄烟"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[smokescreenId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const thick = !(config && config.density === "thin");
            return {
                prepare: Math.round(p(smokescreenId, "tempo", context)) + (thick ? 4 : 0),
                recover: p(smokescreenId, "recover", context),
                cooldown: Math.round(p(smokescreenId, "recharge", context) * (thick ? 1.2 : 0.95)),
                active: 1,
                range: p(smokescreenId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("smokescreen-windup", smokescreenScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", density: config && config.density === "thin" ? "thin" : "thick" }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[smokescreenId], detail: { values: config } };
            const thick = !(config && config.density === "thin");
            return { radius: Math.round(p(smokescreenId, "cloudRadius", context) * (thick ? 0.8 : 1.3) * 100) / 100,
                geometry: "area", style: "smoke", color: 0x6E6E78, label: thick ? "烟幕·浓烟" : "烟幕·薄烟" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const centre = action.targetPosition(), origin = action.origin();
            const body = world.observe(action.actor());
            const thick = !(config && config.density === "thin");
            const radius = Math.max(1.3, Math.min(4.2, Math.round(p(smokescreenId, "cloudRadius", action) * (thick ? 0.8 : 1.3) * 100) / 100));
            const ticks = Math.max(80, Math.round(p(smokescreenId, "cloudTicks", action) * (thick ? 1.35 : 0.75)));
            const linger = Math.max(50, Math.round(p(smokescreenId, "lingerTicks", action)));
            const stage = Math.max(1, Math.min(3, Math.round(p(smokescreenId, "blindStage", action))));
            const speed = Math.max(0.6, p(smokescreenId, "smokeSpeed", action));
            const density = Math.max(20, Math.round(p(smokescreenId, "density", action) * (thick ? 1.3 : 0.75)));
            // 烟团从口边出发；速度真实决定飞行时长，撞到障碍就实际位置开云。
            const head = body === null ? origin : origin.plus(WorldCombat.point(0, body.height() * 0.55, 0));
            const delta = centre.minus(head), distance = delta.length();
            const direction = distance < 0.01 ? action.direction() : delta.unit();
            const travel = Math.max(2, Math.ceil(distance / speed));
            const scenes = WorldFeedback.actionScenes(smokescreenScene);
            let settled = false;
            function bloom(current: CombatAction, point: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                scenes.stop(current, "travel");
                WorldEffects.field(scope, smokescreenField, point, radius,
                    { stage: stage, linger: linger, density: density, refresh: 20, next: {} }, ticks);
                WorldFeedback.emit(scope, smokescreenScene, 1, point,
                    { moment: "bloom", radius: radius, scale: radius / 2.1 }, 30);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)),
                    "world_combat.move.smokescreen.text.cloud", [], 28);
                sound(current, "cobblemon:move.smokescreen.target");
                scenes.finish(current, done);
            }
            sound(action, "cobblemon:move.smokescreen.actor");
            WorldFeedback.emit(world, smokescreenScene, 1, head,
                { moment: "puff", direction: [direction.x(), direction.y(), direction.z()], density: density, scale: radius / 2.1 }, 26);
            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:particle/generic/orb/smokeorb", tint: 0x6E6E78, glow: true,
                scale: Math.max(0.8, Math.min(1.6, radius / 2.1)), pierce: 16
            };
            const flight = LivingActions.projectile(action, {
                speed: speed, range: distance + 0.6, gravity: 0, radius: 0.3, direction: direction,
                lifetime: Math.min(200, travel + 2), appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    // 烟无伤，穿过生物继续飞；只有撞到方块才在撞点开云。
                    if (!hit.blocked()) return;
                    const at = hit.blockPosition();
                    bloom(current, at === null ? hit.position() : at);
                }
            }, function (current: CombatAction) { bloom(current, centre); });
            scenes.show(action, "travel", head, { moment: "travel", projectile: flight, density: density });
        }
    });

    // 呛眼余味存续期间，目标身侧持续飘出没散尽的烟。
    WorldCombat.on("world_combat:move_smokescreen/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== smokescreenEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "smokescreen:" + String(actor.ref()), smokescreenScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
