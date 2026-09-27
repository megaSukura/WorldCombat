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
 *   握（grip → squeeze，提交后）：提交瞬间抓住瞄准到的非友方实体——结算 grip 伤害、把本次定身挂到
 *       本招自己的 carrier（托管效果 `world_combat:psychic_grip`）上、按概率把特防压 1 级；随后在
 *       `squeezeDelay` 刻窗口里持续读 `action.control()`：手动锚点被限制在初始位置上 `drag` 距离内，没有
 *       手动输入（脚本/AI）时把目标推开、拖到一侧而不是拉向自己。每刻的位移都消耗同一份 `drag` 总预算，
 *       实际被原生抗性拒绝时只绷紧手、不把目标假移动。窗口内失去通视或目标走出范围就松手。
 *       窗口结束：只要这次抓取成立、目标仍在范围且通视，就再挤一记 squeeze（不要求它接受 root）。
 *
 * 定身归属：root 由承载本次操纵的 `psychic_grip` 托管效果持有，随动作结束、松手、被取消或驱散一起
 * 收回，只撤本次这一记，不动别的来源。控制没挂上时不假装被握——擒压与窗口末的挤压照常结算。
 *
 * 与同族分开：念力是又快又便宜的骚扰弹；telekinesis 是长时间辅助悬浮；精神强念是短而可读的
 * 控制重击——抓住、按定、拖到一边、压特防，松手前捏一下。
 * 配置 `hold`（缠握）由 resolve 改时序、由公式改定身／操纵预算／挤压／概率。
 */
namespace PokemonSkills {
    /** 持续操纵表现的 key；绑在本招自己的 grip carrier 上，随它一起消失。 */
    const psychicGripKey = "psychic:grip";
    /** 承载本次操纵租约与表现的托管效果；生命周期跟随动作，结束时只撤本次 root。 */
    const psychicGrip = "world_combat:psychic_grip";

    function psychicGripData(json: string): string {
        const value = JSON.parse(json);
        if (typeof value.root !== "number" || !isFinite(value.root) || value.root < 0 || typeof value.victim !== "string")
            throw new Error("Invalid psychic grip");
        return JSON.stringify(value);
    }

    WorldCombat.effect(psychicGrip, 1, 240, "action", psychicGripData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(psychicGrip, "start", function () { });
    WorldCombat.effectHandler(psychicGrip, "end", function (effect) {
        const world = effect.world(), data = JSON.parse(effect.state());
        if (typeof data.root === "number" && data.root > 0) world.operation(data.root, "world_combat:dispel", "{}");
    });

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

    /**
     * 无手动瞄准时的默认拖向：把目标**推离**施法者一侧并带一点侧向，把它从自己面前和通道中间挪开，
     * 而不是像旧行为那样总往身上拉。返回单位方向，调用方再按当前 drag 预算截取落点。
     */
    function psychicDefaultPush(action: CombatAction, initial: CombatPoint, self: CombatPoint): CombatPoint {
        const away = initial.minus(self);
        const heading = away.length() > 0.05 ? away.unit() : aim(action);
        const frame = WorldGeometry.basis(heading);
        const push = heading.scale(0.6).plus(frame.right.scale(0.8));
        return push.length() > 1e-6 ? push.unit() : WorldCombat.point(0, 0, 1);
    }

    define({
        id: psychicId,
        cooldownParameter: "recharge",
        name: "Psychic",
        description: "用念力抓住瞄准到的敌人：定住它、抓取时造成特殊伤害并可能让特防下降 1 级；在短暂的操纵窗口里按住技能键持续瞄准，把念力锚点拖到初始目标周围，它就会被朝锚点带；放手或失去目标就松开定身，窗口结束时若仍握得住，再挤一记。",
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
            let settled = false, grip = 0;

            sound(action, "cobblemon:move.psychic.actor");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }
            /** 松手/收尾：只撤回本次 carrier 持有的那一记 root，别的来源不动。 */
            function releaseLease(current: CombatAction): void {
                if (grip <= 0) return;
                current.world().operation(grip, "world_combat:dispel", "{}");
                grip = 0;
            }

            // 空放短握空：没有可抓的实体，只在瞄准点短握一下空气，不造成任何伤害。
            if (target === null || !world.valid(target)) {
                const spot = psychicAim(action).point || action.targetPosition();
                WorldFeedback.emit(world, psychicScene, 1, spot, { moment: "empty", spirals: spirals, scale: scale, intensity: intensity, path: [] }, 20);
                action.after(Math.max(4, Math.min(8, delay)), function (current) { finish(current); });
                return;
            }
            if (world.friendly(target)) {
                WorldFeedback.emit(world, psychicScene, 1, action.targetPosition(), { moment: "empty", spirals: Math.round(spirals * 0.4), scale: scale, intensity: intensity, path: [] }, 18);
                action.after(6, function (current) { finish(current); });
                return;
            }
            const victim = target;
            const body = world.observe(victim), selfBody = world.observe(actor);
            if (body === null || selfBody === null) { finish(action); return; }
            const initial = body.position();
            // 初始抓取要通视：隔墙的实体抓不到，只短握空。
            if (!world.clear(selfBody.position(), initial)) {
                WorldFeedback.emit(world, psychicScene, 1, initial, { moment: "empty", spirals: Math.round(spirals * 0.5), scale: scale, intensity: intensity, path: [] }, 18);
                action.after(6, function (current) { finish(current); });
                return;
            }

            const landed = hurt(action, victim, psychicId, gripPower, { damage: damageSpec(psychicId, "grip") });
            if (!landed) {
                WorldFeedback.emit(world, psychicScene, 1, initial, { moment: "miss", target: String(victim.ref()) }, 22);
                finish(action);
                return;
            }
            // 本次定身挂到本招 carrier 上由它托管：动作结束、松手、被取消或驱散时随之收回。
            const rootId = world.valid(victim) ? WorldEffects.apply(world, victim, "rooted", {}, gripTicks) : 0;
            if (rootId > 0 && world.valid(victim))
                grip = action.effect(psychicGrip, victim, JSON.stringify({ root: rootId, victim: String(victim.ref()) }), gripTicks);
            // 控制没挂上：不假装被握，只播一次被弹开，擒压与窗口末的挤压照常结算。
            if (grip <= 0)
                WorldFeedback.emit(world, psychicScene, 1, initial, { moment: "resist", target: String(victim.ref()), scale: scale, intensity: intensity }, 24);

            // 大个子抵抗更强：总位移预算按目标身高折减；每刻实际移动由 hitDisplace 再受原生抗性限制。
            const resistance = Math.max(0.5, Math.min(1.3, 1.4 / Math.max(0.4, body.height())));
            const budget = drag * resistance;
            const stepCap = Math.max(0.06, budget / Math.max(1, delay) * 1.6);
            let spent = 0;

            WorldFeedback.text(world, initial.plus(WorldCombat.point(0, 1.25, 0)), psychicGripText, [], 26);
            WorldFeedback.emit(world, psychicScene, 1, initial,
                { moment: "grip", target: String(victim.ref()), spirals: spirals, scale: scale, intensity: intensity, budget: budget }, 24);
            if (grip > 0)
                WorldFeedback.onEffect(world, grip, psychicGripKey, psychicGripScene, 1, initial,
                    { moment: "grip", actor: String(actor.ref()), target: String(victim.ref()),
                      point: [initial.x(), initial.y() + 0.2, initial.z()],
                      spent: 0, budget: budget, remaining: budget, strain: 0,
                      spirals: spirals, scale: scale, intensity: intensity });
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
                releaseLease(current);
                const scope = current.world();
                if (scope.valid(victim) && !scope.friendly(victim)) {
                    const held = scope.observe(victim), self = scope.observe(actor);
                    if (held !== null && self !== null) {
                        const point = held.position();
                        const visible = scope.clear(self.position(), point);
                        if (point.minus(self.position()).length() <= reach + 1.0 && visible) {
                            const crush = hurt(current, victim, psychicId, squeezePower, { damage: damageSpec(psychicId, "squeeze") });
                            // 末伤独立 emit：不随 finish 被立刻收掉；只有真的结算成功才报挤压成功。
                            if (crush) {
                                WorldFeedback.emit(scope, psychicScene, 1, point,
                                    { moment: "squeeze", target: String(victim.ref()), spirals: spirals, scale: scale, intensity: intensity }, 30);
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
                if (held === null || self === null) { releaseLease(current); finish(current); return; }
                const here = held.position();
                if (grip > 0) {
                    // 定身被净化/驱散（或提前到期）时立即松手，不留下没有实际控制的假握画面。
                    let rooted = false;
                    const roots = scope.effects(victim, "world_combat:rooted");
                    for (let i = 0; i < roots.length; i++) if (roots[i].id() === rootId) { rooted = true; break; }
                    if (!rooted) {
                        releaseLease(current);
                        WorldFeedback.emit(scope, psychicScene, 1, here, { moment: "release", target: String(victim.ref()) }, 20);
                        finish(current);
                        return;
                    }
                }
                if (grip > 0 && (here.minus(self.position()).length() > reach + 1.0 || !scope.clear(self.position(), here))) {
                    releaseLease(current);
                    WorldFeedback.emit(scope, psychicScene, 1, here, { moment: "release", target: String(victim.ref()) }, 20);
                    finish(current);
                    return;
                }
                if (grip > 0) {
                    let anchor: CombatPoint;
                    const aim = psychicAim(current);
                    if (aim.manual && aim.point !== null) {
                        const offset = aim.point.minus(initial);
                        anchor = offset.length() > drag ? initial.plus(offset.unit().scale(drag)) : aim.point;
                    } else {
                        // 脚本/AI 没有手动输入时把目标推离自己、拖到一侧，而不是往身上拉。
                        anchor = initial.plus(psychicDefaultPush(current, initial, self.position()).scale(drag));
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
                    // 实际被原生抗性挡住时把张力抬高：读作念力手绷紧，而画面不伪造目标被推走。
                    WorldFeedback.onEffect(scope, grip, psychicGripKey, psychicGripScene, 1, shown, { moment: "grip",
                        actor: String(actor.ref()), target: String(victim.ref()),
                        point: [anchor.x(), anchor.y(), anchor.z()],
                        spent: spent, budget: budget, remaining: Math.max(0, budget - spent), strain: strain,
                        spirals: spirals, scale: scale,
                        intensity: strain ? Math.min(2.4, intensity * 1.5) : intensity });
                }
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
