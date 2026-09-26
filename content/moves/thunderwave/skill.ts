/**
 * 电磁波 / Thunder Wave — 出手方式。
 *
 * 核心念头：一道瞬发、不飞行的直线电击。施法者一放电，电流沿一条通视的直线瞬间铺到线上第一个身体（或墙），
 *   把共享的麻痹身份按上去。它不造成伤害，靠的是可靠与够快；也正因为它走直线，任何挡在线上的东西
 *   都会把它拦下——一堵墙、一个同伴的身体，甚至恰好挤在中间的另一只生物。
 *
 * 幕：
 *   起（windup，提交前）：指尖攒电的预告（`action.present`）。
 *   击（bolt → jolt / immune / shielded / blocked / air）：提交后瞬发。`action.trace(..., true)` 沿直线做权威判定，
 *       谁在线上的第一个，电流就落在谁身上：非友方先按当前转换后的属性与已安装的吸收能力核对电击免疫，
 *       再过麻痹免疫门槛，全部通过才挂共享的 `world_combat:status/paralysis`（宝可梦那一层由共享默认效果同步成原生麻痹）；
 *       友方替它把电流引走，只有墙时电流在墙面炸开，什么都没有时电流在空中散掉。
 *       表现画出的那条线用 `hit.position()`——就是判定真正停下的地方。
 *
 * 反制：切断视线或拉开距离；地面属性把电导进地里、吸收电属性的能力把它吃掉，电属性对麻痹免疫（共享默认规则）。
 *   麻痹本身在原生结算里让目标有 25% 概率失手，并压低它的移动速度。
 */
namespace PokemonSkills {
    const thunderwaveScene = "world_combat:move_thunderwave";
    const thunderwaveJoltText = "world_combat.move.thunderwave.text.jolt";
    const thunderwaveBlockedText = "world_combat.move.thunderwave.text.blocked";
    const thunderwaveShieldedText = "world_combat.move.thunderwave.text.shielded";
    const thunderwaveImmuneText = "world_combat.move.thunderwave.text.immune";
    const thunderwaveMissText = "world_combat.move.thunderwave.text.miss";

    /** 沿直线的折线顶点：两端落在施法者与判定真正停下的地方，中间几下朝侧向抖开，画出的就是判定用的那段直线。 */
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

    /**
     * 电击沿直线走，即使本招不造成伤害，目标对「电属性招式」的原生免疫仍然生效。
     * 属性免疫按当前转换后的类型算（`NativeEffects.read` + `NativeEffects.types`，含特性/效果改过的类型），
     * 相性乘积为 0 就是被导进地里；吸收类能力调用共享只读查询 `NativeAbilities.absorbsType`（与 actual
     * incoming 规则同源，由已安装的 absorption trait 登记 absorbedTypes），它不模拟伤害/回血/增益，只判有效性。
     * 麻痹本身的免疫（电属性、免麻痹能力等）仍由共享 `CombatStatus.inflict` 的门槛另行核对，两者都不绕过。
     */
    function thunderwaveElectricImmune(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        const state = NativeEffects.read(world, actor);
        const types = NativeEffects.types(pokemon, state);
        let factor = 1;
        for (let i = 0; i < types.length; i++) {
            factor *= CobblemonCombat.typeEffectiveness("electric", String(types[i]));
        }
        return factor === 0 || NativeAbilities.absorbsType(pokemon, state, "electric");
    }

    define({
        id: thunderwaveId,
        cooldownParameter: "recharge",
        name: "Thunder Wave",
        description: "发出一道瞬发、不飞行的直线电击，把目标麻住。它不造成伤害，靠的是瞬时与可靠；也正因为走直线，挡在线上的墙或同伴会替目标把电引走。地面属性把电流导进地里，电属性对麻痹免疫。",
        uses: ["点住一个跑得快的目标", "隔开距离先手缴械", "让挡在线上的同伴替目标吃电"],
        kind: "aim",
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
            // 方向或世界点都可放：selected 是玩家/客户端校验过的瞄准点，空点也只表示「朝那个方向放电」。
            const selected = action.targetPosition();
            const lockTicks = Math.max(40, Math.round(p(thunderwaveId, "lockTicks", action)));
            const radius = Math.max(0.18, p(thunderwaveId, "shockRadius", action));
            const arcs = Math.max(3, Math.round(p(thunderwaveId, "arcs", action)));
            const speed = Math.max(0.8, p(thunderwaveId, "joltSpeed", action));
            const intensity = Math.max(0.6, Math.min(2.4, lockTicks / 200));
            const bend = Math.max(0.05, Math.min(0.32, radius * 0.9));
            const scale = Math.max(0.6, Math.min(2, radius / 0.32));
            sound(action, "cobblemon:move.thunderwave.actor");
            // 权威判定先行：第一个身体（含同伴）或方块就是电流真正停下的地方，表现只画到那里。
            const hit = action.trace(origin, selected, radius, true);
            const endpoint = hit.position();
            const landed = hit.hitEntity() ? hit.target() : null;
            const ref = landed === null ? "" : String(landed.ref());
            WorldFeedback.emit(world, thunderwaveScene, 1, origin,
                { moment: "bolt", path: thunderwavePath(origin, endpoint, 5, bend), target: ref, arcs: arcs,
                    flux: Math.round(24 + speed * 12), intensity: intensity, scale: scale }, 22);

            if (landed !== null && String(landed.key()) !== String(self.key())) {
                const at = world.observe(landed);
                const point = at === null ? endpoint : at.position();
                if (world.friendly(landed)) {
                    // 同伴只把电流引走，不挂麻痹。
                    WorldFeedback.emit(world, thunderwaveScene, 1, point, { moment: "shielded", target: ref }, 20);
                    WorldFeedback.text(world, point, thunderwaveShieldedText, [], 22);
                    world.sound("minecraft:block.amethyst_block.resonate", point, 14, "{}");
                } else if (thunderwaveElectricImmune(world, landed) || !CombatStatus.inflict(world, landed, "paralysis", lockTicks)) {
                    // 类型相性归零、被安装的吸收能力吸收，或目标对麻痹免疫（电属性、免麻痹能力）；都按免电呈现。
                    WorldFeedback.emit(world, thunderwaveScene, 1, point, { moment: "immune", target: ref }, 22);
                    WorldFeedback.text(world, point, thunderwaveImmuneText, [], 24);
                    world.sound("minecraft:block.amethyst_block.resonate", point, 14, "{}");
                } else {
                    WorldFeedback.emit(world, thunderwaveScene, 1, point,
                        { moment: "jolt", target: ref, arcs: arcs, intensity: intensity, scale: scale }, 28);
                    WorldFeedback.text(world, point, thunderwaveJoltText, [], 26);
                    world.sound("cobblemon:impact.electric", point, 16, "{}");
                    sound(action, "cobblemon:move.thunderwave.target");
                }
            } else if (hit.blocked()) {
                const blockPoint = hit.blockPosition();
                const point = blockPoint === null ? endpoint : blockPoint;
                WorldFeedback.emit(world, thunderwaveScene, 1, point, { moment: "blocked", face: hit.blockFace() }, 20);
                WorldFeedback.text(world, point, thunderwaveBlockedText, [], 22);
                world.sound("minecraft:block.amethyst_block.resonate", point, 14, "{}");
            } else {
                WorldFeedback.emit(world, thunderwaveScene, 1, endpoint, { moment: "air", arcs: arcs, scale: scale }, 18);
                WorldFeedback.text(world, endpoint, thunderwaveMissText, [], 20);
            }
            done(action);
        }
    });
}
