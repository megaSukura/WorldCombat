/**
 * 终极吸取 / gigadrain 的出手方式。
 *
 * 核心念头：按住技能键，从身边探出一根**粗吸根**，照住当前瞄准方向；按固定拍数每隔 `cadence`
 *   刻沿当刻准线检查一次真实首碰。只有这一拍真的照到有效敌人、并造成真实伤害，才结算该拍伤害、
 *   把一半经共享 `drain` 转回自身，并让一股亮汁回流；照到空地、墙面或被友方挡断，这一拍就干抽。
 *   拍数是固定的：松手、被打断或用尽拍数立即收根，不补发剩余拍。移动Boss靠持续跟瞄维持吸取。
 *
 * 两幕：
 *   起（windup，提交前）：身体四周绿光向地面与手心汇聚，只播预告。
 *   照（每拍 pulse）：从当刻身体位置沿当刻自由瞄准 `trace` 一条 `root` 粗的线；首碰是有效敌人就
 *      结算 `surge` 伤害并抽回 `sap` 比例的汁；首碰是友方或方块、或整条线落空，则该拍不结算、根尖干枯。
 *      每拍都重读当前aim与首碰者，不共用旧目标 ref。
 *
 * 与同族分开：吸取是藤不脱手的一啄、超级吸取把孢荚抛出去、木角用身体撞进去；只有终极吸取是
 *   **一根随时可转向的粗吸根、按固定拍数照准抽取**——画面上看得出根连在真实的射线终点上。
 *
 * 命中、防御、相性与暴击走共享 `impact`；回复走共享伤害载荷的 `drain`，实际只按真实扣血结算，
 * 对宝可梦、原版生物、玩家同一条路。
 */
namespace PokemonSkills {
    const gigaDrainScene = "world_combat:move_gigadrain";
    const gigaDrainGoreText = "world_combat.move.gigadrain.text.gore";
    const gigaDrainWaveText = "world_combat.move.gigadrain.text.wave";
    const gigaDrainMissText = "world_combat.move.gigadrain.text.miss";
    const gigaDrainDryText = "world_combat.move.gigadrain.text.dry";

    /** 当刻自由瞄准：按住技能键时读控制点（逐拍可转向跟瞄），AI 或未声明输入回退到动作选点。 */
    function gigaDrainAim(action: CombatAction): CombatPoint {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3)
                return WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]);
        } catch (error) { }
        try { return action.targetPosition(); } catch (error) { }
        return action.origin().plus(action.direction());
    }

    define({
        id: "gigadrain",
        cooldownParameter: "recharge",
        name: "Giga Drain",
        description: "按住技能键，从身边探出一根粗吸根照住瞄准方向：它按固定拍数每隔一小段时间沿当刻准线检查一次真实首碰，只有照到有效敌人那一拍才造成伤害并把一半转回自身。吸根会被墙和友方挡断，转向空地只会干抽；拍数固定，松手、被打断或用尽拍数立即收根。移动中的目标可以靠持续跟瞄维持吸取。",
        uses: ["隔一段距离持续牵引一个目标的生命", "血线吃紧时靠几拍把血拉回来", "跟着移动的强敌转准心，一边抽一边回血"],
        kind: "aim",
        range: 12.0,
        maxRange: 16.5,
        prepare: 14,
        active: 1,
        recover: 13,
        cooldown: 52,
        maximumTicks: 240,
        style: "grass",
        defaults: { deepPour: false, ai: { maxChase: 16, minGap: 5, healBelow: 0.75, onlyWhenHurt: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("gigadrain", "reach", pokemon), geometry: "line", style: "grass", color: 0x5C9E2E,
                label: config && config.deepPour === true ? "终极吸取·深灌" : "终极吸取" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["gigadrain"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("gigadrain", "tempo", context)),
                recover: Math.round(p("gigadrain", "aftercast", context)),
                cooldown: Math.round(p("gigadrain", "recharge", context)),
                active: 1,
                range: p("gigadrain", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:gigadrain:" + action.id(), gigaDrainScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deepPour: config && config.deepPour === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const power = p("gigadrain", "surge", action);
            const share = p("gigadrain", "sap", action);
            const radius = Math.max(0.35, p("gigadrain", "root", action));
            const waves = Math.max(2, Math.min(4, Math.round(p("gigadrain", "pulses", action))));
            const cadence = Math.max(5, Math.min(14, Math.round(p("gigadrain", "cadence", action))));
            const reach = Math.max(2.0, p("gigadrain", "reach", action));
            const motes = Math.max(14, Math.round(power * 0.6 + share * 70));
            const scale = radius / 0.9;
            const scenes = WorldFeedback.actionScenes(gigaDrainScene);
            let beat = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                try {
                    const body = current.world().observe(actor);
                    if (body !== null) WorldFeedback.emit(current.world(), gigaDrainScene, 1, body.position(),
                        { moment: "retract", scale: scale, motes: motes }, 16);
                } catch (error) { /* the cancelled action already released its world handle */ }
                scenes.finish(current, done);
            }

            /** 照一拍：按当刻aim做真实粗线首碰，只有有效敌人且真实掉血才结算该拍与回流。 */
            function pulse(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const selfBody = scope.observe(actor);
                if (selfBody === null) { finish(current); return; }
                current.stopMovement();
                const from = selfBody.position();
                const aimed = gigaDrainAim(current);
                let delta = aimed.minus(from);
                if (delta.length() < 0.05) delta = current.direction();
                const direction = delta.unit();
                current.face(from.plus(direction.scale(reach)), 90, 60);
                const far = from.plus(direction.scale(reach));
                const hit = current.trace(from, far, radius, true);
                const victim = hit.target();
                const at = hit.position();
                const span = at.minus(from).length();
                const back = span < 0.05 ? WorldCombat.point(0, 1, 0) : from.minus(at).unit();
                const index = beat + 1;
                let contact = "empty", dealt = false;

                if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                    const before = scope.observe(victim);
                    const previous = before === null ? 0 : before.health();
                    const applied = impact(current, hit, "gigadrain", power,
                        { damage: damageSpec("gigadrain", "surge"), drain: share });
                    const after = scope.valid(victim) ? scope.observe(victim) : null;
                    const actual = after === null ? previous : previous - after.health();
                    dealt = applied && (after === null || actual > 0);
                    contact = dealt ? "enemy" : "ward";
                } else if (victim !== null) {
                    contact = "ally";
                } else if (hit.blocked()) {
                    contact = "block";
                }
                beat = index;

                // 连续粗根：本拍真实终点与接触状态，与判定读同一份位置；只有回流那拍才点亮汁流。
                scenes.show(current, "root", at, {
                    moment: "root", path: ["source", [at.x(), at.y(), at.z()]],
                    direction: [back.x(), back.y(), back.z()], span: span, contact: contact,
                    flowRate: dealt ? motes : 0, dryRate: dealt ? 0 : Math.max(8, Math.round(motes * 0.5)),
                    scale: scale, motes: motes
                });
                if (dealt) {
                    WorldFeedback.emit(scope, gigaDrainScene, 1, at, {
                        moment: "surge", path: ["source", [at.x(), at.y(), at.z()]],
                        direction: [back.x(), back.y(), back.z()], span: span,
                        scale: scale, motes: motes, wave: index, waves: waves
                    }, 26);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), gigaDrainWaveText, [index, waves], 20);
                    sound(current, "cobblemon:move.gigadrain.target");
                } else {
                    WorldFeedback.emit(scope, gigaDrainScene, 1, at, {
                        moment: contact === "block" || contact === "ally" ? "block" : "dry",
                        scale: scale, motes: Math.max(8, Math.round(motes * 0.6))
                    }, 18);
                    if (victim !== null) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), gigaDrainDryText, [], 16);
                    else if (contact === "empty") WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.8, 0)), gigaDrainMissText, [], 16);
                }
                if (index >= waves) { finish(current); return; }
                current.after(cadence, pulse);
            }

            sound(action, "cobblemon:move.gigadrain.actor");
            const body = world.observe(actor);
            if (body !== null) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.6, 0)), gigaDrainGoreText, [], 22);
            pulse(action);
        }
    });

    // 玩家按住技能键维持吸根、逐拍自由转向跟瞄；AI 提交仍带一个目标点，读同一条控制输入。
    WorldCombat.preview("world_combat:gigadrain", JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}
