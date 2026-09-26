/**
 * 精神强念 / psychic —— 注册与动作。
 *
 * 核心念头：一记**抓住并操纵**的念力重手。射程内抓住一个敌人，把它按在原地的同时，
 * 用一段短操纵窗口的持续瞄准把念力锚点拖到初始目标`drag`距离内的任意处；目标每刻只按
 * 同一份总位移预算被推向锚点，受原生碰撞与抗性限制。窗口结束捏合挤压一次。
 * 它是本组最重、最慢、最贵的一发，身份是「握」。
 *
 * 两幕：
 *   起（windup，提交前）：施法者身前念力内收，目标身上亮起锁定环，只播预告。
 *   握（grip → squeeze，提交后）：提交瞬间抓住瞄准到的非友方实体——结算 grip 伤害、挂共享
 *       `world_combat:rooted` 定住它、按概率把特防压 1 级；随后在 `squeezeDelay` 刻窗口里持续读
 *       `action.control()`：有手动锚点时目标被推向该锚点（锚点被限制在初始位置上 `drag` 距离内），
 *       没有输入（脚本/AI）时默认朝施法者带；每刻的位移都消耗同一份 `drag` 总预算，实际被原生
 *       抗性拒绝时只绷紧手、不把目标假移动。窗口内失去通视或目标走出范围就松手。
 *       窗口结束：只要这次抓取成立、目标仍在范围且通视，就再挤一记 squeeze（不要求它接受 root）。
 *
 * 与同族分开：念力是又快又便宜的骚扰弹；telekinesis 是长时间辅助悬浮；精神强念是短而可读的
 * 控制重击——抓住、按定、拖到一边、压特防，松手前捏一下。
 * 配置 `hold`（缠握）由 resolve 改时序、由公式改定身／操纵预算／挤压／概率。
 */
namespace PokemonSkills {
    /** 从持续输入里读手动锚点；token>0 表示玩家正在持续引导，0 是脚本/AI 的隐含选择。 */
    function psychicAim(action: CombatAction): { manual: boolean; point: CombatPoint | null } {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3)
                return { manual: typeof parsed.token === "number" && parsed.token > 0,
                    point: WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]) };
        } catch (error) { }
        return { manual: false, point: null };
    }

    define({
        id: psychicId,
        cooldownParameter: "recharge",
        name: "Psychic",
        description: "用念力抓住瞄准到的敌人：定住它、抓取时造成特殊伤害并可能让特防下降 1 级；在短暂的操纵窗口里按住技能键持续瞄准，把念力锚点拖到初始目标周围，它就会被朝锚点带；窗口结束时若仍握得住，再挤一记。",
        uses: ["中远距离点名一个高威胁目标", "把冲上来的敌人按在原地", "把目标从队友面前、门口或通道中间拖到一侧"],
        kind: "aim",
        range: 12,
        maxRange: 16,
        prepare: 14,
        active: 0,
        recover: 9,
        cooldown: 40,
        style: "psychic",
        defaults: { hold: false, ai: { maxChase: 15, fresh: true, focusThreat: true } },
        fields: [flag("hold", "缠握")],
        indicator: function (config, pokemon) {
            return { radius: p(psychicId, "reach", pokemon), geometry: "area", style: "psychic", color: 0x7A52E6,
                label: config && config.hold === true ? "精神强念·缠握" : "精神强念" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[psychicId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(psychicId, "tempo", context)),
                recover: Math.round(p(psychicId, "aftercast", context)),
                cooldown: Math.round(p(psychicId, "recharge", context)),
                active: 0,
                range: p(psychicId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:psychic:windup", psychicScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", hold: config && config.hold === true }));
            action.present("world_combat:psychic:lock", psychicScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "lock", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const gripPower = p(psychicId, "grip", action);
            const squeezePower = p(psychicId, "squeeze", action);
            const drag = Math.max(0.2, p(psychicId, "drag", action));
            const gripTicks = Math.max(20, Math.round(p(psychicId, "gripTicks", action)));
            const chance = Math.max(0.02, Math.min(0.9, p(psychicId, "sunderChance", action)));
            const stages = Math.max(1, Math.round(p(psychicId, "sunderStages", action)));
            const delay = Math.max(3, Math.round(p(psychicId, "squeezeDelay", action)));
            const spirals = Math.max(10, Math.round(p(psychicId, "spirals", action)));
            const intensity = Math.max(0.6, Math.min(2.4, gripPower / 92));
            const scale = Math.max(0.6, Math.min(2.2, gripPower / 92));
            const reach = action.range();
            const scenes = WorldFeedback.actionScenes(psychicScene, 1);
            let settled = false;

            sound(action, "cobblemon:move.psychic.actor");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, done);
            }

            // 空放短握空：没有可抓的实体，只在瞄准点短握一下空气，不造成任何伤害。
            if (target === null || !world.valid(target)) {
                const spot = psychicAim(action).point || action.targetPosition();
                scenes.show(action, "empty", spot, { moment: "empty", spirals: spirals, scale: scale, intensity: intensity, path: [] });
                action.after(Math.max(4, Math.min(8, delay)), function (current) { finish(current); });
                return;
            }
            if (world.friendly(target)) {
                scenes.show(action, "empty", action.targetPosition(), { moment: "empty", spirals: Math.round(spirals * 0.4), scale: scale, intensity: intensity, path: [] });
                action.after(6, function (current) { finish(current); });
                return;
            }
            const victim = target;
            const body = world.observe(victim), selfBody = world.observe(actor);
            if (body === null || selfBody === null) { finish(action); return; }
            const initial = body.position();
            // 初始抓取要通视：隔墙的实体抓不到，只短握空。
            if (!world.clear(selfBody.position(), initial)) {
                scenes.show(action, "empty", initial, { moment: "empty", spirals: Math.round(spirals * 0.5), scale: scale, intensity: intensity, path: [] });
                action.after(6, function (current) { finish(current); });
                return;
            }

            const landed = hurt(action, victim, psychicId, gripPower, { damage: damageSpec(psychicId, "grip") });
            if (!landed) {
                WorldFeedback.emit(world, psychicScene, 1, initial, { moment: "miss", target: String(victim.ref()) }, 22);
                finish(action);
                return;
            }
            // 正常定身仍沿原时长；被控制免疫的目标不领 root，仍可自由走出范围，不影响随后的挤压。
            if (world.valid(victim)) WorldEffects.apply(world, victim, "rooted", {}, gripTicks);

            // 大个子抵抗更强：总位移预算按目标身高折减；每刻实际移动由 hitDisplace 再受原生抗性限制。
            const resistance = Math.max(0.5, Math.min(1.3, 1.4 / Math.max(0.4, body.height())));
            const budget = drag * resistance;
            const stepCap = Math.max(0.06, budget / Math.max(1, delay) * 1.6);
            let spent = 0;

            WorldFeedback.text(world, initial.plus(WorldCombat.point(0, 1.25, 0)), psychicGripText, [], 26);
            scenes.show(action, "grip", initial, { moment: "grip", target: String(victim.ref()), spirals: spirals,
                scale: scale, intensity: intensity, strain: 0, spent: 0, budget: budget,
                point: [initial.x(), initial.y() + 0.2, initial.z()],
                path: [String(actor.ref()), [initial.x(), initial.y(), initial.z()]] });
            if (world.valid(victim) && world.random() < chance) {
                NativeEffects.boost(world, victim, "spd", -stages);
                const marked = world.observe(victim);
                if (marked !== null) {
                    WorldFeedback.emit(world, psychicScene, 1, marked.position(), { moment: "sunder", target: String(victim.ref()), spirals: spirals }, 24);
                    WorldFeedback.text(world, marked.position().plus(WorldCombat.point(0, 1.4, 0)), psychicSunderText, [stages], 28);
                }
            }

            /** 结束只一次挤压：本次抓取成立、目标仍在范围且通视才落；被 root 拒绝也照挤。 */
            function squeeze(current: CombatAction): void {
                if (settled) return;
                scenes.stop(current, "grip");
                const scope = current.world();
                if (scope.valid(victim) && !scope.friendly(victim)) {
                    const held = scope.observe(victim), self = scope.observe(actor);
                    if (held !== null && self !== null) {
                        const point = held.position();
                        const visible = scope.clear(self.position(), point);
                        if (point.minus(self.position()).length() <= reach + 1.0 && visible) {
                            const crush = hurt(current, victim, psychicId, squeezePower, { damage: damageSpec(psychicId, "squeeze") });
                            scenes.show(current, "squeeze", point, { moment: "squeeze", target: String(victim.ref()),
                                spirals: spirals, scale: scale, intensity: intensity });
                            if (crush) {
                                sound(current, "cobblemon:impact.psychic");
                                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), psychicSqueezeText, [], 24);
                            }
                        }
                        WorldFeedback.emit(scope, psychicScene, 1, point, { moment: "release", target: String(victim.ref()), spirals: Math.round(spirals * 0.5) }, 18);
                    }
                }
                finish(current);
            }

            /** 操纵一刻：读当刻锚点，按同一份总预算把目标推向它；失去通视/超距就松手。 */
            function advance(current: CombatAction, elapsed: number): void {
                if (settled) return;
                const scope = current.world();
                const held = scope.observe(victim), self = scope.observe(actor);
                if (held === null || self === null) { finish(current); return; }
                const here = held.position();
                if (here.minus(self.position()).length() > reach + 1.0 || !scope.clear(self.position(), here)) {
                    scenes.stop(current, "grip");
                    WorldFeedback.emit(scope, psychicScene, 1, here, { moment: "release", target: String(victim.ref()) }, 20);
                    finish(current);
                    return;
                }
                let anchor: CombatPoint;
                const aim = psychicAim(current);
                if (aim.manual && aim.point !== null) {
                    const offset = aim.point.minus(initial);
                    anchor = offset.length() > drag ? initial.plus(offset.unit().scale(drag)) : aim.point;
                } else {
                    // 普通式默认向自己带；AI/脚本没有手动输入时也走这一条。
                    anchor = self.position();
                }
                const toAnchor = anchor.minus(here);
                let moved = 0, attempted = 0;
                if (toAnchor.length() > 0.05) {
                    const remaining = Math.max(0, budget - spent);
                    attempted = Math.min(remaining, toAnchor.length(), stepCap);
                    if (attempted > 0.001) {
                        moved = scope.hitDisplace(victim, toAnchor.unit().scale(attempted));
                        spent += moved;
                    }
                }
                const after = scope.observe(victim);
                const shown = after === null ? here : after.position();
                const strain = attempted > 0.001 && moved < attempted - 0.001 ? 1 : 0;
                // 实际被原生抗性挡住时把亮度抬高：读作念力手绷紧，而画面不伪造目标被推走。
                scenes.show(current, "grip", shown, { moment: "grip", target: String(victim.ref()),
                    spirals: spirals, scale: scale, intensity: strain ? Math.min(2.4, intensity * 1.5) : intensity,
                    strain: strain, spent: spent, budget: budget,
                    point: [anchor.x(), anchor.y(), anchor.z()],
                    path: [String(actor.ref()), [anchor.x(), anchor.y(), anchor.z()]] });
                if (elapsed + 1 >= delay) { squeeze(current); return; }
                current.after(1, function (next) { advance(next, elapsed + 1); });
            }

            advance(action, 0);
        }
    });

    // 玩家先瞄准一个实体抓取，再按住技能键持续移动念力锚点；空瞄/空放由动作自己收束。
    WorldCombat.preview("world_combat:psychic", JSON.stringify({
        radius: 0.6, lineOfSight: true, input: { version: 1, steps: ["point"], sustained: true }
    }));
}
