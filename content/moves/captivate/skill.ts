/**
 * 诱惑 / Captivate — 执行组织。
 *
 * 核心念头：当场抬眸，把目光当作钩子——被真正看见的异性对手心神一荡，特攻大幅下降；
 *   不看、同性、掩体后与拉开的距离都是它天然的空门。献舞则把这份注视摊成以自己为圆心的一圈。
 *
 * 出手：`kind: "aim"`——回眸选一个看得见的敌人实体；献舞不需要目标，直接对着空地旋开。
 *   提交前不看世界；提交后回眸才做视线、性别与射程判定，空放与目标离场都安静收尾。
 * 命中：真正被削低特攻的目标才挂共享的 world_combat:captivate_gaze（身份 world_combat:status/captivated），
 *       并 NativeEffects.boost 大幅下降特攻；顶到 −6 级底线或特性挡下时不出现任何符号，只留一声灰白。
 * 视线：回眸要求 world.clear 通视，且宝可梦之间要求异性；其他生物没有性别，直接有效。
 * 献舞：以自身为圆心张开 ringRadius 的一圈，凡看得见、在圈内的非友方各迷住一次，最多 maxOnlookers 人。
 * 反制：同性宝可梦免疫、掩体后无效、距离超出 gazeRange 够不到；献舞要站进人堆里，起手与冷却都更长。
 *   它只降低能力等级，不抓、不拉、不定身。
 */
namespace PokemonSkills {
    function captivateAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 宝可梦之间要求异性；没有性别概念的原版生物、其他模组生物与玩家直接有效。 */
    function captivateAllows(world: CombatWorld, self: CombatActor, target: CombatActor): boolean {
        if (String(self.domain()) !== "cobblemon" || String(target.domain()) !== "cobblemon") return true;
        const a = String(CobblemonCombat.pokemon(self).gender()).toLowerCase();
        const b = String(CobblemonCombat.pokemon(target).gender()).toLowerCase();
        return a === "male" && b === "female" || a === "female" && b === "male" || a === "m" && b === "f" || a === "f" && b === "m";
    }

    /** 迷住一个目标：真正削低特攻才挂身份、播符号与浮字；顶到负阶底线或特性挡下时只留灰白。返回实际下降级数。 */
    function captivateCharm(world: CombatWorld, target: CombatActor, drop: number, duration: number): number {
        const body = world.observe(target);
        if (body === null) return 0;
        const changed = NativeEffects.boost(world, target, "spa", -drop);
        if (changed === 0) {
            WorldFeedback.emit(world, captivateScene, 1, body.position(), { moment: "ward", target: String(target.ref()) }, 18);
            WorldFeedback.text(world, captivateAbove(body.position()), "world_combat.move.captivate.text.resist", [], 30);
            return 0;
        }
        const applied = Math.abs(changed);
        MobEffects.apply(world, target, captivateEffect, duration, 0);
        WorldFeedback.emit(world, captivateScene, 1, body.position(),
            { moment: "charm", target: String(target.ref()), drop: applied, hearts: 6 + applied * 8 }, 32);
        WorldFeedback.text(world, captivateAbove(body.position()), "world_combat.move.captivate.text.charm", [applied], 40);
        return applied;
    }

    define({
        id: captivateId,
        cooldownParameter: "recharge",
        name: "诱惑",
        description: "当场抬眸或原地起舞，让看得见的对手特攻大幅下降。回眸只对一个看得见的敌人生效；献舞以自己为中心旋开一圈，把看得见这份舞姿的非友方一起迷住。它不抓、不拉，只降低特攻能力等级；宝可梦之间要求异性，非宝可梦没有性别。",
        uses: ["削弱法系威胁的特攻输出", "趁敌人聚拢时一次迷住几个", "在掩体多、弹道不好用的狭窄空间里施压"],
        kind: "aim",
        range: 6,
        maxRange: 9,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 180,
        style: "charm",
        defaults: { pose: "glance" },
        fields: [
            choice("pose", "姿态", ["glance", "dance"], ["回眸", "献舞"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[captivateId], detail: { values: config }, world, actor, attributes };
            const dance = !!(config && config.pose === "dance");
            return {
                prepare: Math.round(p(captivateId, "tempo", context)) + (dance ? 5 : 0),
                recover: p(captivateId, "recover", context),
                cooldown: Math.round(p(captivateId, "recharge", context) * (dance ? 1.3 : 1)),
                active: 1,
                range: dance ? Math.max(1.5, p(captivateId, "ringRadius", context)) : p(captivateId, "gazeRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("captivate-windup", captivateScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", dance: config && config.pose === "dance" ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const dance = !!(config && config.pose === "dance");
            const context: NumberContext | undefined = pokemon ? { pokemon, skill: skills[captivateId], detail: { values: config } } : undefined;
            return { radius: dance ? (context ? p(captivateId, "ringRadius", context) : 2.6) : (context ? p(captivateId, "gazeRange", context) : 6),
                geometry: dance ? "circle" : "line", style: "charm", label: dance ? "诱惑·献舞" : "诱惑" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const drop = Math.max(1, Math.min(3, Math.round(p(captivateId, "drop", action))));
            const duration = Math.max(80, Math.round(p(captivateId, "duration", action)));
            const dance = !!(config && config.pose === "dance");
            sound(action, "minecraft:block.amethyst_block.chime");
            if (dance) {
                // 献舞：self 入口，以自己为圆心在提交后动态选择看见舞姿的非友方。
                const radius = Math.max(1.5, p(captivateId, "ringRadius", action));
                const cap = Math.max(1, Math.round(p(captivateId, "maxOnlookers", action)));
                let caught = 0;
                WorldGeometry.select(world, WorldGeometry.ring(origin, 0, radius), function (actor, facts) {
                    if (caught >= cap || facts.friendly() || !facts.visible()) return;
                    if (!world.clear(origin, facts.position())) return;
                    if (!captivateAllows(world, self, actor)) return;
                    if (captivateCharm(world, actor, drop, duration) > 0) caught++;
                });
                WorldFeedback.emit(world, captivateScene, 1, origin,
                    { moment: "dance", radius: radius, caught: caught, drop: drop, hearts: 10 + caught * 14, scale: radius / 2.2 }, 36);
                if (caught > 0)
                    WorldFeedback.text(world, captivateAbove(origin), "world_combat.move.captivate.text.dance", [caught, drop], 40);
                done(action);
                return;
            }
            // 回眸：只认一个看得见的合法敌实体；空放、目标离场与挡在掩体后都安静收尾。
            const target = action.target();
            const targetPoint = action.targetPosition();
            if (target === null || !world.valid(target) || world.friendly(target) || String(target.ref()) === String(self.ref())) {
                WorldFeedback.emit(world, captivateScene, 1, targetPoint, { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const at = world.observe(target);
            const point = at === null ? targetPoint : at.position();
            if (!world.clear(origin, point)) {
                WorldFeedback.emit(world, captivateScene, 1, point, { moment: "fizzle", target: String(target.ref()) }, 16);
                done(action);
                return;
            }
            WorldFeedback.emit(world, captivateScene, 1, origin,
                { moment: "gaze", path: [String(self.ref()), String(target.ref())], target: String(target.ref()), motes: 16 + drop * 10 }, 22);
            if (!captivateAllows(world, self, target)) {
                WorldFeedback.emit(world, captivateScene, 1, point, { moment: "immune", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, captivateAbove(point), "world_combat.move.captivate.text.immune", [], 32);
                done(action);
                return;
            }
            captivateCharm(world, target, drop, duration);
            done(action);
        }
    });

    // 迷醉存续期间，目标头顶持续浮起沉迷的心。
    WorldCombat.on("world_combat:move_captivate/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== captivateEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "captivate:" + String(actor.ref()), captivateScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
