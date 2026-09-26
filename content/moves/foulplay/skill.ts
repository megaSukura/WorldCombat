/**
 * 欺诈 / foulplay 的出手方式。
 *
 * 核心念头：施法者自己不发力——一条暗影手臂从脚下顺瞄准方向逐刻爬出去，第一个碰到的实体就是被反拧的对象，
 *   把它的力气按在它自己身上。所以伤害读的是**实际抓到者的物攻**：对手越壮，这一记越重，施法者弱也咬得动强敌。
 *   施法者自身仍按共享伤害公式的基础系数参与，只是不再是主来源。
 *
 * 两幕：
 *   起（coil，提交前）：施法者蹲身，脚边暗影聚成一片，只播预告。
 *   伸（crawl → seize / drag / miss）：提交后暗影沿释放时锁定的瞄准方向逐刻伸长（`crawl` 决定每刻头部推进量，
 *       `grasp` 是 trace 半径，`reach` 严格封顶）；每刻用 `action.trace` 只探出头部新走的那一段，把友方与实墙都算作
 *       接触。首碰实体即抓到者：是敌人就按**它当下的物攻**结算一次 trick 伤害；是友方/自己就停在它身上、不伤；
 *       撞墙在实际方块表面散手；一路无人就空伸收回。纠缠式把实际抓到者分 3 刻朝施法者实际方向拖近一段，暗影同步缩回；
 *       反手式当刻反拧松手，不留持续标记。伤害被拒（免疫等）时不附加拉拽与减速。
 *
 * 与同族分开：本组同族都以对手／自己的某种状态为武器；欺诈读的是**实际抓到者此刻的物攻**，
 *   而且直接把这份力气还给它。它和扑击（读自己的防御）方向相反：一个借别人的，一个用自己的。
 */
namespace PokemonSkills {
    define({
        id: foulplayId,
        cooldownParameter: "recharge",
        name: "Foul Play",
        description: "伸出一条暗影手臂，顺瞄准方向逐刻爬出：第一个碰到的实体就是被反拧的对象。抓到敌人时按**它当下的物攻**结算物理伤害——对手越壮，借来的力气越大。墙会挡住手臂，没人碰到就空伸收回；纠缠式命中的同时把对方朝自己拖近一小段。",
        uses: ["用它自己的力气打它", "越壮的目标咬得越重", "纠缠式把强敌拖进近身"],
        kind: "aim",
        range: 5.2,
        maxRange: 9.6,
        prepare: 4,
        active: 0,
        recover: 6,
        cooldown: 22,
        style: "dark",
        defaults: { cling: false, ai: { maxChase: 9, strongAt: 100 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(foulplayId, "reach", pokemon) : 5.2, geometry: "line", style: "dark", color: 0x6C5CE0, label: "欺诈" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[foulplayId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(foulplayId, "coil", context)),
                recover: Math.round(p(foulplayId, "settle", context)),
                cooldown: Math.round(p(foulplayId, "recharge", context)),
                active: 0,
                range: p(foulplayId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("foulplay:coil", foulplayScene, 1, action.origin(), JSON.stringify({ moment: "coil" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const raw = aim(action);
            const direction = raw.length() < 1e-6 ? action.direction() : raw.unit();
            const crawl = Math.max(0.25, p(foulplayId, "crawl", action));
            const reach = Math.max(2.0, p(foulplayId, "reach", action));
            const grasp = p(foulplayId, "grasp", action);
            const tendrils = Math.max(4, Math.round(p(foulplayId, "tendrils", action)));
            const cling = config && config.cling === true;
            const stagger = Math.max(1, Math.round(p(foulplayId, "stagger", action)));
            const pullTicks = 3;
            const scale = Math.max(0.6, Math.min(1.8, grasp / 0.42));
            const scenes = WorldFeedback.actionScenes(foulplayScene, 1);
            let head = origin, travelled = 0, settled = false;

            function finish(current: CombatAction): void { if (settled) return; settled = true; scenes.finish(current, done); }

            /** 空伸、撞墙或撞到不该伤的身体：暗手从实际落点散去。 */
            function dissolve(current: CombatAction, point: CombatPoint, blocked: boolean): void {
                const scope = current.world();
                scenes.stop(current, "crawl");
                WorldFeedback.emit(scope, foulplayScene, 1, point, { moment: "miss", scale: scale, blocked: blocked ? 1 : 0 }, 20);
                if (!blocked) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), foulplayMissText, [], 22);
                sound(current, "minecraft:entity.vex.hurt");
                finish(current);
            }

            function endDrag(current: CombatAction, victimRef: string, pull: number): void {
                const scope = current.world();
                scenes.stop(current, "drag");
                const victim = scope.actor(victimRef);
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (body !== null) {
                    if (scope.valid(victim!)) scope.marker(victim!, "minecraft:slowness", stagger, 1);
                    WorldFeedback.emit(scope, foulplayScene, 1, body.position(),
                        { moment: "drag", target: victimRef, pull: pull, scale: scale }, 24);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), foulplayDragText, [Math.round(pull * 10) / 10], 24);
                }
                finish(current);
            }

            /** 纠缠回收：分 3 刻把实际抓到者按 pull 总预算朝施法者实际方向拖近，暗手同步缩回。 */
            function pullIn(current: CombatAction, victimRef: string, pull: number, remaining: number, perTick: number, elapsed: number): void {
                if (settled) return;
                const scope = current.world();
                const self = scope.observe(actor);
                const victim = scope.actor(victimRef);
                const held = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (self === null || held === null || remaining <= 0.05 || elapsed >= pullTicks) { endDrag(current, victimRef, pull); return; }
                const toward = self.position().minus(held.position());
                if (toward.length() < 0.05) { endDrag(current, victimRef, pull); return; }
                const moved = scope.displace(victim!, toward.unit().scale(Math.min(remaining, perTick)));
                const left = Math.max(0, remaining - moved);
                scenes.show(current, "drag", held.position(),
                    { moment: "drag", target: victimRef, path: ["source", victimRef], scale: scale, remaining: left });
                if (moved <= 0.001) { endDrag(current, victimRef, pull); return; }
                current.after(1, function (next: CombatAction) { pullIn(next, victimRef, pull, left, perTick, elapsed + 1); });
            }

            /** 抓到敌人：按**这个实际被抓者当下**的物攻重算威力，只有真伤才反拧、才可纠缠。 */
            function seize(current: CombatAction, point: CombatPoint, victimRef: string): void {
                const scope = current.world();
                const victim = scope.actor(victimRef);
                scenes.stop(current, "crawl");
                if (victim === null || !scope.valid(victim)) { dissolve(current, point, false); return; }
                const power = p(foulplayId, "trick", withTarget(factContext(current), victim));
                const intensity = Math.max(0.5, Math.min(2.2, power / 85));
                const landed = hurt(current, victim, foulplayId, power, { damage: damageSpec(foulplayId, "trick"), knockback: false });
                if (!landed) {
                    WorldFeedback.emit(scope, foulplayScene, 1, point, { moment: "miss", target: victimRef, scale: scale }, 20);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), foulplayMissText, [], 22);
                    sound(current, "cobblemon:impact.dark");
                    finish(current);
                    return;
                }
                WorldFeedback.emit(scope, foulplayScene, 1, point,
                    { moment: "seize", target: victimRef, tendrils: tendrils, scale: scale, intensity: intensity }, 40);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), foulplaySeizeText, [], 24);
                sound(current, "cobblemon:impact.dark");
                if (!cling) { finish(current); return; }
                const pull = p(foulplayId, "pull", withTarget(factContext(current), victim));
                scenes.show(current, "drag", point,
                    { moment: "drag", target: victimRef, path: ["source", victimRef], pull: pull, scale: scale, remaining: pull });
                pullIn(current, victimRef, pull, pull, pull / pullTicks, 0);
            }

            /** 逐刻伸长：只 trace 新走出的那一段；首碰实体或方块就停，走满 reach 就收回。 */
            function extend(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const from = head;
                const to = from.plus(direction.scale(Math.min(crawl, reach - travelled)));
                const contact = current.trace(from, to, grasp, true);
                const at = contact.position();
                travelled += at.minus(from).length();
                head = at;
                scenes.show(current, "crawl", origin,
                    { moment: "crawl", path: ["source", [at.x(), at.y(), at.z()]], tendrils: tendrils, scale: scale, reach: reach });
                if (contact.hitEntity()) {
                    const victim = contact.target();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim) || String(victim.ref()) === String(actor.ref()))
                        dissolve(current, at, true);
                    else seize(current, at, String(victim.ref()));
                    return;
                }
                if (contact.blocked()) { dissolve(current, at, true); return; }
                if (travelled >= reach - 0.01) { dissolve(current, at, false); return; }
                current.after(1, extend);
            }

            sound(action, "cobblemon:move.shadowball.actor");
            extend(action);
        }
    });
}
