/**
 * 电磁波 / Thunder Wave — 出手方式。
 *
 * 核心念头：一道瞬发、不飞行的直线电击。施法者一放电，电流沿一条通视的直线立刻打到目标身上，
 *   把共享的麻痹身份按上去。它不造成伤害，靠的是必中与可靠；也正因为它走直线，任何挡在线上的东西
 *   都会把它拦下——一堵墙、一个同伴的身体，甚至恰好挤在中间的另一只生物。
 *
 * 幕：
 *   起（windup，提交前）：指尖攒电的预告（`action.present`）。
 *   击（bolt → jolt / immune / shielded / blocked）：提交后瞬发。`action.trace` 沿直线做权威判定，
 *       谁在线上的第一个，电流就落在谁身上：非友方挂共享的 `world_combat:status/paralysis`（宝可梦那一层
 *       由共享默认效果同步成原生麻痹），友方替它把电流引走，只有墙时电流在墙面炸开、什么也不发生。
 *
 * 反制：切断视线或拉开距离；电属性对麻痹免疫（共享默认规则）。麻痹本身在原生结算里让目标有 25% 概率失手，
 *   并压低它的移动速度。
 */
namespace PokemonSkills {
    const thunderwaveScene = "world_combat:move_thunderwave";
    const thunderwaveJoltText = "world_combat.move.thunderwave.text.jolt";
    const thunderwaveBlockedText = "world_combat.move.thunderwave.text.blocked";
    const thunderwaveShieldedText = "world_combat.move.thunderwave.text.shielded";
    const thunderwaveImmuneText = "world_combat.move.thunderwave.text.immune";

    /** 沿直线的折线顶点：两端落在双方身上，中间几下朝侧向抖开，画出的就是判定用的那条直线。 */
    function thunderwavePath(origin: CombatPoint, target: CombatPoint, segments: number, bend: number): number[][] {
        const path: number[][] = [[origin.x(), origin.y(), origin.z()]];
        const delta = target.minus(origin);
        const horizontal = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
        const nx = horizontal < 0.001 ? 1 : -delta.z() / horizontal;
        const nz = horizontal < 0.001 ? 0 : delta.x() / horizontal;
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const at = origin.plus(delta.scale(t));
            const taper = 1 - Math.abs(2 * t - 1);
            const side = Math.sin(i * 2.399) * bend * taper;
            const lift = Math.sin(i * 1.7) * bend * 0.6 * taper;
            path.push([at.x() + nx * side, at.y() + lift, at.z() + nz * side]);
        }
        path.push([target.x(), target.y(), target.z()]);
        return path;
    }

    define({
        id: thunderwaveId,
        cooldownParameter: "recharge",
        name: "Thunder Wave",
        description: "The user launches a weak jolt of electricity that paralyzes the target.",
        uses: ["点住一个跑得快的目标", "隔开距离先手缴械", "让挡在线上的同伴替目标吃电"],
        kind: "enemy",
        range: 8,
        maxRange: 15,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 34,
        style: "jolt",
        defaults: { surge: false, ai: { maxChase: 10, preferSwift: true, leaveStation: true } },
        fields: [
            flag("surge", "蓄长")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[thunderwaveId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(thunderwaveId, "tempo", context)),
                recover: p(thunderwaveId, "recover", context),
                cooldown: Math.round(p(thunderwaveId, "recharge", context)),
                active: 1,
                range: p(thunderwaveId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("thunderwave:windup:" + action.id(), thunderwaveScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", surge: config && config.surge ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[thunderwaveId], detail: { values: config } };
            return { radius: p(thunderwaveId, "reach", context), geometry: "line", style: "jolt", color: 0xF2E24A,
                label: config && config.surge === true ? "电磁波·蓄长" : "电磁波·快放" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const target = action.target();
            const lockTicks = Math.max(40, Math.round(p(thunderwaveId, "lockTicks", action)));
            const radius = Math.max(0.18, p(thunderwaveId, "shockRadius", action));
            const arcs = Math.max(3, Math.round(p(thunderwaveId, "arcs", action)));
            const speed = Math.max(0.8, p(thunderwaveId, "joltSpeed", action));
            const intensity = Math.max(0.6, Math.min(2.4, lockTicks / 200));
            const bend = Math.max(0.05, Math.min(0.32, radius * 0.9));
            const aim = target !== null && world.valid(target) ? action.targetPosition() : origin.plus(action.direction().scale(action.range()));
            const ref = target === null ? "" : String(target.ref());
            sound(action, "cobblemon:move.thunderwave.actor");
            const hit = action.trace(origin, aim, radius);
            const landed = hit.hitEntity() ? hit.target() : null;
            WorldFeedback.emit(world, thunderwaveScene, 1, origin,
                { moment: "bolt", path: thunderwavePath(origin, aim, 5, bend), target: ref, arcs: arcs,
                    flux: Math.round(24 + speed * 12), intensity: intensity,
                    scale: Math.max(0.6, Math.min(2, radius / 0.32)) }, 22);

            if (landed !== null && !world.friendly(landed) && String(landed.key()) !== String(self.key())) {
                const struck = landed;
                const at = world.observe(struck);
                const point = at === null ? aim : at.position();
                if (!CombatStatus.inflict(world, struck, "paralysis", lockTicks)) {
                    WorldFeedback.emit(world, thunderwaveScene, 1, point, { moment: "immune", target: String(struck.ref()) }, 22);
                    WorldFeedback.text(world, point, thunderwaveImmuneText, [], 24);
                    world.sound("minecraft:block.amethyst_block.resonate", point, 14, "{}");
                } else {
                    WorldFeedback.emit(world, thunderwaveScene, 1, point,
                        { moment: "jolt", target: String(struck.ref()), arcs: arcs, intensity: intensity,
                            scale: Math.max(0.6, Math.min(2, radius / 0.32)) }, 28);
                    WorldFeedback.text(world, point, thunderwaveJoltText, [], 26);
                    world.sound("cobblemon:impact.electric", point, 16, "{}");
                    sound(action, "cobblemon:move.thunderwave.target");
                }
            } else if (landed !== null) {
                const at = world.observe(landed);
                const point = at === null ? aim : at.position();
                WorldFeedback.emit(world, thunderwaveScene, 1, point, { moment: "shielded", target: String(landed.ref()) }, 20);
                WorldFeedback.text(world, point, thunderwaveShieldedText, [], 22);
                world.sound("minecraft:block.amethyst_block.resonate", point, 14, "{}");
            } else {
                WorldFeedback.emit(world, thunderwaveScene, 1, hit.position(), { moment: "blocked" }, 20);
                WorldFeedback.text(world, hit.position(), thunderwaveBlockedText, [], 22);
                world.sound("minecraft:block.amethyst_block.resonate", hit.position(), 14, "{}");
            }
            done(action);
        }
    });
}
