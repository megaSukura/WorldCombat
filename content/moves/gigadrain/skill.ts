/**
 * 终极吸取 / gigadrain 的出手方式。
 *
 * 核心念头：从对手脚下轰然立起一圈吸根，把它的生命整片抽走——三拍连抽，本族里最大、最远、最慢的一口。
 *
 * 两幕：
 *   起（windup，提交前）：地面裂开、绿光在脚下汇聚，只播预告。
 *   抽（erupt → surge ×N，提交后）：目标脚下拱出一圈吸根并锁定，随后按 `pulses` 分拍结算：
 *       每拍造成 `surge` 伤害、沿「目标→自身」抽出一束汁流，伤害的一半经共享 `drain` 转回自身。
 *       拍与拍之间保持一条可见的吸流（beam），数得出还剩几拍；目标倒下或离场则提前收势。
 *
 * 与同族分开：吸取是藤不脱手的一啄、超级吸取先抛孢荚、木角用身体撞；只有终极吸取是**原地立起大根、
 * 分多拍**的抽取，玩家数着画面里的拍子就能把它认出来。它也是射程最远、冷却最长、学它的人最多的一招。
 *
 * 命中、防御、相性与暴击每拍走共享 `hurt`；回复走共享伤害载荷的 `drain`，对所有战斗者同一条路。
 */
namespace PokemonSkills {
    const gigaDrainScene = "world_combat:move_gigadrain";
    const gigaDrainGoreText = "world_combat.move.gigadrain.text.gore";
    const gigaDrainWaveText = "world_combat.move.gigadrain.text.wave";
    const gigaDrainMissText = "world_combat.move.gigadrain.text.miss";

    define({
        id: "gigadrain",
        name: "Giga Drain",
        description: "A nutrient-draining attack. The user's HP is restored by up to half the damage taken by the target.",
        uses: ["从远处把对手整片生命抽走", "在血量吃紧时靠它把血线拉回来", "用连续几拍压住一个高价值目标"],
        kind: "enemy",
        range: 12.0,
        maxRange: 16.5,
        prepare: 14,
        active: 1,
        recover: 13,
        cooldown: 52,
        style: "grass",
        defaults: { deepPour: false, ai: { maxChase: 16, healBelow: 0.75, openAt: 6, onlyWhenHurt: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("gigadrain", "root", pokemon), geometry: "area", style: "grass", color: 0x5C9E2E,
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
            const target = action.target();
            const power = p("gigadrain", "surge", action);
            const share = p("gigadrain", "sap", action);
            const root = p("gigadrain", "root", action);
            const waves = Math.max(2, Math.min(4, Math.round(p("gigadrain", "pulses", action))));
            const cadence = Math.max(5, Math.round(p("gigadrain", "cadence", action)));
            const motes = Math.max(12, Math.round(power * 0.5 + share * 60));
            const scale = root / 0.9;
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 抽一拍：`dealt` 是已经结算过的拍数，本次是第 `dealt + 1` 拍。 */
            function wave(current: CombatAction, ref: string, dealt: number): void {
                const scope = current.world();
                const live = ref === "" ? null : scope.actor(ref);
                if (live === null || !scope.valid(live)) { finish(current); return; }
                const body = scope.observe(live);
                const at = body === null ? current.targetPosition() : body.position();
                const self = scope.observe(current.actor());
                const from = self === null ? current.origin() : self.position();
                const landed = hurt(current, live, "gigadrain", power,
                    { damage: damageSpec("gigadrain", "surge"), drain: share });
                const flow = from.minus(at), span = flow.length();
                const inward = span < 0.05 ? WorldCombat.point(0, 1, 0) : flow.unit();
                WorldFeedback.emit(scope, gigaDrainScene, 1, at,
                    { moment: "surge", path: ["target", "source"], target: ref,
                        direction: [inward.x(), inward.y(), inward.z()], span: span,
                        scale: scale, motes: motes, wave: dealt + 1, waves: waves, last: dealt + 1 >= waves ? 1 : 0 }, 30);
                if (landed) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), gigaDrainWaveText, [dealt + 1, waves], 22);
                if (dealt + 1 >= waves) { finish(current); return; }
                current.after(cadence, function (next: CombatAction) { wave(next, ref, dealt + 1); });
            }

            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, gigaDrainScene, 1, action.targetPosition(), { moment: "fizzle", scale: scale, motes: motes }, 16);
                WorldFeedback.text(world, action.targetPosition().plus(WorldCombat.point(0, 0.9, 0)), gigaDrainMissText, [], 20);
                done(action);
                return;
            }

            sound(action, "cobblemon:move.gigadrain.actor");
            const hold = cadence * (waves - 1) + 34;
            const link = action.origin().minus(action.targetPosition());
            const linkSpan = link.length();
            const linkIn = linkSpan < 0.05 ? WorldCombat.point(0, 1, 0) : link.unit();
            WorldFeedback.emit(world, gigaDrainScene, 1, action.targetPosition(),
                { moment: "erupt", path: ["target", "source"], target: String(target.ref()),
                    scale: scale, motes: motes, waves: waves }, 30);
            WorldFeedback.emit(world, gigaDrainScene, 1, action.targetPosition(),
                { moment: "beam", path: ["target", "source"], target: String(target.ref()),
                    direction: [linkIn.x(), linkIn.y(), linkIn.z()], span: linkSpan,
                    motes: motes, waves: waves }, hold);
            WorldFeedback.text(world, action.targetPosition().plus(WorldCombat.point(0, 1.4, 0)), gigaDrainGoreText, [], 24);
            wave(action, String(target.ref()), 0);
        }
    });
}
