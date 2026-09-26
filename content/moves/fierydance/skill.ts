/**
 * 火之舞 / fierydance 的出手方式。
 *
 * 核心念头：**两片火翼随身体旋舞展开**——两片相对的火焰翼尖从身周起始半径起转，绕身体扫过半圈、半径一路
 *   展到终止半径；翼尖扫过谁，谁就吃一记火焰并被向外推开。身周的每一刻都跟真实身体走，玩家靠走位把火翼
 *   贴到敌人侧面；两条翼缘之间没扫到的空隙可以躲。整舞不留火场、不额外结尾爆炸。
 *
 * 三幕：
 *   起（windup，提交前）：火焰裹住全身、两片火翼在身侧点起，只播预告，可被打断。
 *   舞（dance，提交后）：`dance` 刻里两片相对翼尖绕真实身体转半圈，半径从 `inner` 展到 `outer`。每一刻按
 *       当刻真实身体位置对每条翼缘各做一次 `trace`（含友方与墙），直线上的第一个身体或墙就是那条翼缘的端点；
 *       墙截断该段。每片翼对同一目标最多结算一次 `blaze` 伤害（整招对同一目标最多两片翼各一次），命中后沿
 *       当刻从身体指向目标的径向推开 `push` 格。
 *   旺（surge / miss）：整支舞至少命中一次才掷一次 `blazeChance`，按 `NativeEffects` 实际涨到的特攻级数播回执；
 *       一片都没扫到只留收焰。
 *
 * 与同族分开：充电光束是远远一条连着的细束、要求持续瞄准；火之舞是贴着自己旋开的两片火翼、用走位贴到两侧。
 *
 * 自由瞄准：`kind: "aim"`——自由方向决定两片火翼的初始朝向，空舞合法；攻击权限仍由命中层控制。舞期间允许
 *   正常移动，两片火翼始终围绕真实身体。配置 `spiral`（旋舞）由 resolve 改时序、由公式改外圈／威力／级数。
 */
namespace PokemonSkills {
    const fierydanceScene = "world_combat:move_fierydance";
    const fierydanceHitText = "world_combat.move.fierydance.text.hit";
    const fierydanceSurgeText = "world_combat.move.fierydance.text.surge";
    const fierydanceMissText = "world_combat.move.fierydance.text.miss";
    const fierydanceWallText = "world_combat.move.fierydance.text.wall";

    function fierydanceFlat(point: CombatPoint): CombatPoint { return WorldCombat.point(point.x(), 0, point.z()); }

    function fierydanceHeading(direction: CombatPoint): CombatPoint {
        const flat = fierydanceFlat(direction);
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    function fierydanceVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    define({
        freeMovement: true,
        id: "fierydance",
        cooldownParameter: "recharge",
        name: "Fiery Dance",
        description: "两片火翼随身体旋舞展开：从身周起始半径绕身体扫过半圈、一路展到终止半径；翼尖扫到的人各吃一记火焰并被向外推开。玩家靠走位让火翼贴到敌人侧面，两片翼之间没扫到的空隙可以躲。命中后有机会提高自身特攻。",
        uses: ["贴着自己旋开两片火翼、扫过身周一圈", "用走位把一片翼缘贴到敌人侧面", "命中后让火焰更旺、特攻提升"],
        kind: "aim",
        range: 2.8,
        maxRange: 4.2,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "dance",
        defaults: { spiral: false, ai: { maxChase: 5, preferCrowd: true, blazeFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("fierydance", "outer", pokemon), geometry: "area", style: "dance", color: 0xF08030,
                label: config && config.spiral === true ? "旋舞" : "火之舞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["fierydance"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("fierydance", "tempo", context)),
                recover: Math.round(p("fierydance", "aftercast", context)),
                cooldown: Math.round(p("fierydance", "recharge", context)),
                active: 0,
                range: p("fierydance", "outer", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_fierydance:windup", fierydanceScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", spiral: config && config.spiral === true, windup: prepare,
                    spin: p("fierydance", "spin", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(fierydanceScene);
            const world = action.world();
            const actor = action.actor();
            if (world.observe(actor) === null) { done(action); return; }
            const inner = Math.max(0.4, p("fierydance", "inner", action));
            const outer = Math.max(inner + 0.2, p("fierydance", "outer", action));
            const radius = Math.max(0.15, p("fierydance", "edgeRadius", action));
            const power = p("fierydance", "blaze", action);
            const chance = Math.max(0.05, Math.min(0.95, p("fierydance", "blazeChance", action)));
            const stages = Math.max(1, Math.round(p("fierydance", "blazeStages", action)));
            const dance = Math.max(4, Math.round(p("fierydance", "dance", action)));
            const spin = Math.max(6, Math.round(p("fierydance", "spin", action)));
            const push = Math.max(0, p("fierydance", "push", action));
            const heading = fierydanceHeading(aim(action));
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const scale = Math.max(0.6, Math.min(2.4, outer / 2.8));
            const intensity = Math.max(0.5, Math.min(2.4, power / 80));
            const struckA: { [ref: string]: boolean } = Object.create(null);
            const struckB: { [ref: string]: boolean } = Object.create(null);
            const previous: { wingA: CombatPoint | null; wingB: CombatPoint | null } = { wingA: null, wingB: null };
            let hits = 0, surged = false, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (hits > 0) surge(current);
                else {
                    const scope = current.world(), self = scope.observe(actor);
                    if (self !== null) {
                        WorldFeedback.emit(scope, fierydanceScene, 1, self.position(),
                            { moment: "miss", spin: Math.round(spin * 0.5), scale: scale }, 18);
                        WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, self.height() + 0.1, 0)),
                            fierydanceMissText, [], 20);
                    }
                }
                scenes.finish(current, done);
            }

            /** 整舞至少命中一次才掷一次；按实际涨到的特攻级数播，满级或被拒不留成功回执。 */
            function surge(current: CombatAction): void {
                if (surged) return;
                const scope = current.world();
                if (scope.random() >= chance) return;
                const delta = NativeEffects.boost(scope, actor, "spa", stages);
                if (delta <= 0) return;
                surged = true;
                const self = scope.observe(actor);
                const at = self === null ? current.origin() : self.position();
                WorldFeedback.emit(scope, fierydanceScene, 1, at,
                    { moment: "surge", target: String(actor.ref()), stages: delta, spin: spin, scale: scale }, 28);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, self === null ? 1.6 : self.height() + 0.1, 0)),
                    fierydanceSurgeText, [delta], 28);
                sound(current, "minecraft:block.beacon.activate");
            }

            /** 处理一条翼缘的接触：第一个身体或墙就是端点；每片翼对同一目标最多结算一次。 */
            function land(current: CombatAction, contact: CombatImpact, endpoint: CombatPoint, struck: { [ref: string]: boolean }): void {
                const scope = current.world();
                const lander = contact.hitEntity() ? contact.target() : null;
                const victim = lander !== null && scope.valid(lander) && !scope.friendly(lander) ? lander : null;
                if (victim !== null && !struck[String(victim.ref())]) {
                    struck[String(victim.ref())] = true;
                    const landed = impact(current, contact, "fierydance", power,
                        { damage: damageSpec("fierydance", "blaze") });
                    if (landed) {
                        hits++;
                        WorldFeedback.emit(scope, fierydanceScene, 1, endpoint,
                            { moment: "hit", target: String(victim.ref()), spin: spin, scale: scale, intensity: intensity }, 20);
                        WorldFeedback.text(scope, endpoint.plus(WorldCombat.point(0, 1.1, 0)), fierydanceHitText, [hits], 22);
                        sound(current, "cobblemon:impact.fire");
                        if (scope.valid(victim)) {
                            const target = scope.observe(victim), self = scope.observe(actor);
                            if (target !== null && self !== null) {
                                const away = fierydanceFlat(target.position().minus(self.position()));
                                if (away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                            }
                        }
                    }
                } else if (contact.blocked() && !contact.hitEntity()) {
                    WorldFeedback.emit(scope, fierydanceScene, 1, endpoint,
                        { moment: "wall", face: contact.blockFace(), spin: Math.round(spin * 0.4), scale: scale }, 16);
                    WorldFeedback.text(scope, endpoint.plus(WorldCombat.point(0, 0.7, 0)), fierydanceWallText, [], 18);
                }
            }

            /** 第 `sideSign` 片火翼在进度 `progress`、半径 `r` 处的真实端点，并沿当刻与上一刻的翼尖各判一次。 */
            function wing(current: CombatAction, sideSign: number, key: "wingA" | "wingB", r: number, progress: number,
                struck: { [ref: string]: boolean }): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) return;
                const origin = self.position(), width = Math.max(0.4, self.width());
                const angle = progress * Math.PI;
                const direction = WorldCombat.point(
                    heading.x() * Math.cos(angle) + side.x() * sideSign * Math.sin(angle), 0,
                    heading.z() * Math.cos(angle) + side.z() * sideSign * Math.sin(angle));
                const start = origin.plus(direction.scale(Math.max(0.2, width * 0.5 + 0.05)));
                const tip = origin.plus(direction.scale(r));
                const contact = current.trace(start, tip, radius, true);
                scenes.show(current, key, start,
                    { moment: "dance", wing: key, point: fierydanceVertex(contact.position()),
                        path: [fierydanceVertex(start), fierydanceVertex(contact.position())],
                        inner: inner, outer: outer, radius: r, spin: spin, scale: scale, intensity: intensity });
                land(current, contact, contact.position(), struck);
                const last = previous[key];
                if (last !== null) {
                    const swept = current.trace(last, tip, radius, true);
                    land(current, swept, swept.position(), struck);
                }
                previous[key] = tip;
            }

            function step(current: CombatAction, tick: number): void {
                const self = current.world().observe(actor);
                if (self === null) { finish(current); return; }
                const progress = Math.min(1, (tick + 1) / dance);
                const r = inner + (outer - inner) * progress;
                wing(current, 1, "wingA", r, progress, struckA);
                wing(current, -1, "wingB", r, progress, struckB);
                if (tick + 1 >= dance) { finish(current); return; }
                current.after(1, function (next: CombatAction) { step(next, tick + 1); });
            }

            sound(action, "minecraft:entity.blaze.shoot");
            step(action, 0);
        }
    });
}
