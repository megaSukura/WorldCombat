/**
 * 巨声 / hypervoice 的出手方式。
 *
 * 核心念头：这是一声朝前压出去的整片声墙。施法者扎住脚、吸满一口气，把一声咆哮朝瞄准方向推出去，
 *   锥内每个活体被同一堵声墙轰中并被直直推回去。它几乎不看远近（本族边缘保留最高），也不看掩体、
 *   不看地面——声墙就是它的形状。代价是吼完要喘很久，且没有附带状态。
 *
 * 三幕：
 *   蓄（windup，提交前）：气与尘往喉口收、脚下尘环向内合拢的预告；起手可被打断。
 *   吼（wave → hit）：提交后声墙整片扫出；锥内每个敌人按边缘保留（很高）衰减后各挨一次 `blast`，
 *       并沿声墙前进方向被推开 `push`；命中处炸开一蓬尘点。
 *   散（余波）：声墙推到尽头后就散了，不再造成伤害。
 *
 * 与同族分开：爆音波是自己为心的整圈炸、虫鸣是近强远弱的锥、魅惑之声是必定命中的整圈声场；
 *   巨声是**最宽的一道前锥、几乎不衰减、把整片人朝前推**，且唯一没有附加状态。
 *
 * 选取 `kind: "aim"`：方向、世界点或任意阵营实体都能放，允许空吼；提交与执行都不要求存在敌人。
 *   判定与画面读同一份数据：同一锥心、同一 3D 朝向（可上下瞄）、同一半角与长度，方块只做拦截不存在感，
 *   声音按既有规则越掩体，伤害仍遵守敌我与 sound 免疫。
 *
 * 配置 `focused`（聚声）由 resolve 改时序、由公式改张角／射程／威力／击退：开启＝更窄更远更重。
 */
namespace PokemonSkills {
    const hypervoiceScene = "world_combat:move_hypervoice";
    const hypervoiceHitText = "world_combat.move.hypervoice.text.hit";
    const hypervoiceMissText = "world_combat.move.hypervoice.text.miss";

    /** 声锥的实体判定：以锥心为顶点、沿 3D 朝向张开半角、推出 reach 格；与画面 cone_volume 同源。 */
    function hypervoiceInCone(centre: CombatPoint, axis: CombatPoint, reach: number, cosHalf: number, point: CombatPoint): boolean {
        const delta = point.minus(centre), distance = delta.length();
        if (distance > reach) return false;
        if (distance < 0.35) return true;
        return (delta.x() * axis.x() + delta.y() * axis.y() + delta.z() * axis.z()) / distance >= cosHalf - 1e-9;
    }

    /** 扇面地面的有序顶点：原点 + 从瞄准方向左右各半个张角间采样的弧点；保留给落点提示用。 */
    function hypervoiceFan(origin: CombatPoint, direction: CombatPoint, reach: number, arcDegrees: number, samples: number): number[][] {
        const half = Math.min(180, Math.max(10, arcDegrees)) * Math.PI / 360;
        const base = Math.atan2(direction.x(), direction.z());
        const points: number[][] = [[origin.x(), origin.y() + 0.06, origin.z()]];
        for (let i = 0; i <= samples; i++) {
            const angle = base - half + 2 * half * i / samples;
            points.push([origin.x() + Math.sin(angle) * reach, origin.y() + 0.06, origin.z() + Math.cos(angle) * reach]);
        }
        return points;
    }

    define({
        id: "hypervoice",
        cooldownParameter: "recharge",
        name: "Hyper Voice",
        description: "扎住脚，把一声咆哮朝瞄准方向整片压出去：锥内每个敌人被同一堵声墙轰中，几乎不分远近，并被直直推回去。可朝任意方向、地面点或敌人发声，也可以吼空；它不看掩体、不看地面，也没有附加状态——只是最响、最宽的一声。聚声更窄更远更重。",
        uses: ["一次扫到瞄准方向上一大片敌人", "把冲上来的对手整片推回去", "隔着矮墙仍能震到对手", "用一次长喘换最宽的一声"],
        kind: "aim",
        range: 7.2,
        maxRange: 11,
        prepare: 12,
        active: 0,
        recover: 12,
        cooldown: 30,
        style: "shout",
        defaults: { focused: false, ai: { maxChase: 9, minFoes: 1 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("hypervoice", "reach", pokemon), geometry: "cone", style: "shout",
                color: 0xE0E4F0, label: config && config.focused === true ? "巨声·聚声" : "巨声·散声" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["hypervoice"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("hypervoice", "tempo", context)),
                recover: Math.round(p("hypervoice", "settle", context)),
                cooldown: Math.round(p("hypervoice", "recharge", context)),
                active: skills["hypervoice"].active,
                range: p("hypervoice", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("hypervoice:charge", hypervoiceScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", focused: config && config.focused === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            const centre = body === null ? action.origin() : body.position();
            const rawDirection = aim(action);
            const axis = rawDirection.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : rawDirection.unit();
            const power = p("hypervoice", "blast", action);
            const arc = p("hypervoice", "arc", action);
            const reach = Math.max(4.0, p("hypervoice", "reach", action));
            const falloff = Math.max(0.6, Math.min(0.98, p("hypervoice", "falloff", action)));
            const push = p("hypervoice", "push", action);
            const cap = Math.max(1, Math.round(p("hypervoice", "maxTargets", action)));
            const flow = Math.max(40, Math.round(50 + arc * 1.1 + reach * 8));
            const marks = Math.max(12, Math.round(16 + power * 0.22));
            // 判定与画面同一半角：客户端 cone_volume 的 angleDegrees 读这同一个值，边缘就是实际范围。
            const half = Math.max(1, Math.min(85, arc / 2));
            const cosHalf = Math.cos(half * Math.PI / 180);
            let dealt = 0;

            // A bounded sphere covers every direction before the unchanged 3D cone test.
            world.query(centre, reach, false).forEach(function (enemy) {
                const facts = world.observe(enemy);
                if (facts === null || world.friendly(enemy)) return;
                if (String(enemy.ref()) === String(actor.ref()) || dealt >= cap) return;
                const at = facts.position();
                if (!hypervoiceInCone(centre, axis, reach, cosHalf, at)) return;
                const distance = at.minus(centre).length();
                const reachRatio = reach <= 0 ? 0 : Math.min(1, distance / reach);
                const strength = 1 - (1 - falloff) * reachRatio;
                if (!hurt(action, enemy, "hypervoice", power * strength, { damage: damageSpec("hypervoice", "blast"), sound: true })) return;
                dealt++;
                const away = at.minus(centre);
                if (world.valid(enemy) && away.length() > 0.2) {
                    const flat = WorldCombat.point(away.x(), 0, away.z()).unit();
                    world.hitDisplace(enemy, flat.scale(push * strength));
                }
                WorldFeedback.emit(world, hypervoiceScene, 1, at,
                    { moment: "hit", target: String(enemy.ref()), strength: strength, scale: Math.max(0.6, Math.min(2.2, power / 95)),
                        count: Math.round(14 + power * strength * 0.2), intensity: Math.max(0.5, Math.min(2.2, power * strength / 95)) }, 24);
            });

            WorldFeedback.emit(world, hypervoiceScene, 1, centre,
                { moment: "wave", direction: [axis.x(), axis.y(), axis.z()], path: hypervoiceFan(centre, axis, reach, half * 2, 14),
                    arc: arc, half: half, reach: reach, flow: flow, marks: marks, hits: dealt,
                    intensity: Math.max(0.7, Math.min(2.4, power / 95)) }, 30);
            if (dealt === 0) WorldFeedback.emit(world, hypervoiceScene, 1, centre,
                { moment: "miss", direction: [axis.x(), axis.y(), axis.z()] }, 20);
            sound(action, "minecraft:entity.warden.roar");
            sound(action, "minecraft:entity.warden.sonic_boom");
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.5, 0)),
                dealt > 0 ? hypervoiceHitText : hypervoiceMissText, dealt > 0 ? [dealt] : [], 26);
            done(action);
        }
    });
}
