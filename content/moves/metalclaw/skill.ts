/**
 * 金属爪 / metalclaw 的出手方式。
 *
 * 核心念头：贴身一对铁爪左右各劈一下，爪刃劈中活物就被磨出锋口；磨出的物攻让下一记劈得更重。
 *   它是四式里最近、最快、最便宜的一记——不靠单次伤害，靠贴着目标连打把物攻一点点喂起来。
 *
 * 两幕：
 *   起（windup，提交前）：双爪在身侧张开、刃口亮起一层冷光，只播预告，可被打断。
 *   劈（execute，提交后）：沿瞄准方向朝前一记 `trace`，命中非友方即结算 `rake` 接触伤害并把目标带开一点；
 *       连爪式在 `gap` 刻后补上第二记；每记命中各掷一次磨利，成功则物攻提升（上限 `sharpenStages` 级）——
 *       下一记（本招或别的物理招）经共享结算更重。两记都空只留一道空劈的风。
 *
 * 与同族分开：钢翼是横向一扇、把面前的人一起扫开、磨的是防御；金属爪是贴脸两点、磨的是攻击，越劈越重。
 *
 * 配置 `hone`（磨爪）由 resolve 改时序、由公式改威力／几率／击退，提交后才触碰世界。
 */
namespace PokemonSkills {
    const metalclawScene = "world_combat:move_metalclaw";
    const metalclawSharpenText = "world_combat.move.metalclaw.text.sharpen";
    const metalclawHitText = "world_combat.move.metalclaw.text.hit";
    const metalclawMissText = "world_combat.move.metalclaw.text.miss";

    define({
        id: "metalclaw",
        cooldownParameter: "recharge",
        name: "Metal Claw",
        description: "贴脸连爪目标：连爪式左右两记、磨爪式一记更重；每记命中都有几率磨利、提高自身物攻。",
        uses: ["贴身左右两爪连劈", "用命中把物攻一点点磨起来", "开战几拍里把自己喂成重手"],
        kind: "enemy",
        range: 2.6,
        maxRange: 3.4,
        prepare: 6,
        active: 0,
        recover: 6,
        cooldown: 22,
        style: "claw",
        defaults: { hone: false, ai: { maxChase: 6, buildUp: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("metalclaw", "reach", pokemon) * 1.3, geometry: "cone", style: "claw", color: 0xC8CEDA,
                label: config && config.hone === true ? "磨爪" : "金属爪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["metalclaw"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("metalclaw", "tempo", context)),
                recover: Math.round(p("metalclaw", "aftercast", context)),
                cooldown: Math.round(p("metalclaw", "recharge", context)),
                active: 0,
                range: p("metalclaw", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_metalclaw:windup", metalclawScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", hone: config && config.hone === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const reach = p("metalclaw", "reach", action);
            const radius = p("metalclaw", "radius", action);
            const power = p("metalclaw", "rake", action);
            const chance = Math.max(0.02, Math.min(0.9, p("metalclaw", "sharpenChance", action)));
            const cap = Math.max(1, Math.round(p("metalclaw", "sharpenStages", action)));
            const knock = p("metalclaw", "knock", action);
            const sparks = Math.max(6, Math.round(p("metalclaw", "sparks", action)));
            const gap = Math.max(2, Math.round(p("metalclaw", "gap", action)));
            const hone = !!(config && config.hone === true);
            const direction = aim(action);
            const scale = Math.max(0.6, Math.min(2.0, radius / 0.5));
            const intensity = Math.max(0.5, Math.min(2.4, power / 55));
            let landed = 0, gained = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (landed === 0) {
                    const scope = current.world(), self = scope.observe(actor);
                    const from = self === null ? current.origin() : self.position();
                    WorldFeedback.emit(scope, metalclawScene, 1, from.plus(direction.scale(reach * 0.6)),
                        { moment: "miss", sparks: Math.round(sparks * 0.5), scale: scale }, 18);
                    WorldFeedback.text(scope, from.plus(WorldCombat.point(0, 1.0, 0)), metalclawMissText, [], 20);
                }
                done(current);
            }

            /** 劈中后的磨利掷骰：每记各掷一次，整次施放最多磨起 cap 级。 */
            function sharpen(current: CombatAction, point: CombatPoint): void {
                if (gained >= cap || current.world().random() >= chance) return;
                const scope = current.world();
                NativeEffects.boost(scope, actor, "atk", 1);
                gained++;
                const self = scope.observe(actor);
                const at = self === null ? point : self.position();
                WorldFeedback.emit(scope, metalclawScene, 1, at,
                    { moment: "sharpen", target: String(actor.ref()), stages: gained, scale: scale, intensity: intensity }, 26);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, self === null ? 1.5 : self.height() + 0.1, 0)),
                    metalclawSharpenText, [gained], 28);
                sound(current, "minecraft:block.anvil.land");
            }

            function rake(current: CombatAction, index: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const from = self.position(), to = from.plus(direction.scale(reach));
                const trace = current.trace(from, to, radius);
                WorldFeedback.emit(scope, metalclawScene, 1, from,
                    { moment: "rake", side: index, sparks: sparks, scale: scale, intensity: intensity,
                      path: [[from.x(), from.y() + self.height() * 0.55, from.z()], [to.x(), to.y() + self.height() * 0.55, to.z()]] }, 16);
                sound(current, "minecraft:entity.player.attack.sweep");
                const victim = trace.target();
                if (trace.hitEntity() && victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                    const hit = impact(current, trace, "metalclaw", power,
                        { damage: damageSpec("metalclaw", "rake"), contact: true });
                    if (hit) {
                        landed++;
                        if (scope.valid(victim)) scope.displace(victim, direction.scale(knock));
                        WorldFeedback.emit(scope, metalclawScene, 1, trace.position(),
                            { moment: "hit", target: String(victim.ref()), side: index, sparks: sparks, scale: scale, intensity: intensity }, 20);
                        if (index === 0 || landed === 1)
                            WorldFeedback.text(scope, trace.position().plus(WorldCombat.point(0, 1.1, 0)), metalclawHitText, [], 22);
                        sound(current, "cobblemon:impact.steel");
                        sharpen(current, trace.position());
                    }
                }
                if (!hone && index === 0) { current.after(gap, function (next: CombatAction) { rake(next, 1); }); return; }
                finish(current);
            }

            rake(action, 0);
        }
    });
}
