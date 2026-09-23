/**
 * 龙之舞 / dragondance 的出手方式。
 *
 * 核心念头：一道螺旋上升的龙气。舞者原地拧身盘旋，一圈比一圈高，龙气沿身侧盘成上升的螺旋；收势时落回地面，
 * 龙气向外炸成一圈，物攻与速度一起抬起。它是这一族里唯一会离地、也是唯一同时抬两项的舞之一。
 *
 * 三幕：
 *   起式（windup，提交前）：拧身收势、龙气自脚下盘起；可被打断，打断不消耗任何东西。
 *   盘旋（提交后）：物攻与速度各抬起（原生 +1），并把这段「龙势」挂成可见窗口；随后按 turns 圈盘旋，
 *     每圈把身位沿螺旋送出一段，「高飞」时另加一点向上的冲量。
 *   落地（收势）：龙气向外炸成一圈，浮出结果；窗口走完时龙势散去，这段舞抬起的攻速等级一并收回。
 *
 * 与同族分开：剑舞是前压的连斩、蝶舞原地扬鳞、胜利之舞踏步立冠；龙之舞是**螺旋上升**，抬物攻与速度。
 */
namespace PokemonSkills {
    const dragondanceScene = "world_combat:move_dragondance";
    const dragondanceAiry = "world_combat:dragondance_airy";
    const dragondanceText = "world_combat.move.dragondance.text.soared";
    const dragondanceFadeText = "world_combat.move.dragondance.text.faded";
    /** 表现里的参考半径：`data.scale = 实际螺旋半径 / 这个数`。 */
    const dragondanceGyre = 0.7;
    const dragondanceStats = ["atk", "spe"];

    function dragondanceStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 多项一起抬高，返回共同抬到的最小级数（只按真正抬到的量记窗口）。 */
    function dragondanceGrant(world: CombatWorld, actor: CombatActor, amount: number): number {
        let least = amount;
        for (let index = 0; index < dragondanceStats.length; index++) {
            const stat = dragondanceStats[index], before = dragondanceStage(world, actor, stat);
            NativeEffects.boost(world, actor, stat, amount);
            least = Math.min(least, dragondanceStage(world, actor, stat) - before);
        }
        return Math.max(0, least);
    }
    function dragondanceOpen(world: CombatWorld, actor: CombatActor, ticks: number, levels: number): void {
        if (levels <= 0) return;
        const existing = MobEffects.read(world, actor, dragondanceAiry);
        const total = Math.min(6, Math.max(0, existing === null ? 0 : existing.amplifier()) + levels);
        MobEffects.apply(world, actor, dragondanceAiry, ticks, total);
    }

    define({
        id: "dragondance",
        cooldownParameter: "wait",
        name: "龙之舞",
        description: "激烈地跳起神秘且强有力的舞蹈，从而提高自己的攻击和速度。",
        uses: ["开战前把攻速一起垫起来", "被追急了先盘旋一圈，用速度脱身", "在对手接近的空档里跃起蓄势"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 108,
        style: "dragon",
        stationary: true,
        defaults: { soar: true, ai: { maxChase: 16, minGap: 3 } },
        fields: [flag("soar", "高飞")],
        indicator: function (config, pokemon) {
            return { radius: Math.max(1.2, p("dragondance", "gyre", pokemon) + 0.8), geometry: "area", style: "dragon", color: 0x8A6CFF,
                label: config && config.soar ? "龙之舞 · 高飞" : "龙之舞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["dragondance"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("dragondance", "tempo", context)),
                recover: Math.round(p("dragondance", "aftercast", context)),
                cooldown: Math.round(p("dragondance", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_dragondance:coil", dragondanceScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", soar: config && config.soar ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(2, Math.round(p("dragondance", "gift", action))));
            const turns = Math.max(2, Math.min(4, Math.round(p("dragondance", "turns", action))));
            const gyre = Math.max(0.3, p("dragondance", "gyre", action));
            const lift = Math.max(0, p("dragondance", "lift", action));
            const beat = Math.max(4, Math.round(p("dragondance", "beat", action)));
            const span = Math.max(80, Math.round(p("dragondance", "span", action)));
            const drakes = Math.max(10, Math.round(p("dragondance", "drakes", action)));
            const soar = config ? config.soar !== false : true;
            const scale = gyre / dragondanceGyre;
            const home = body.position();
            const levels = dragondanceGrant(world, actor, gift);
            dragondanceOpen(world, actor, span, levels);
            let index = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function land(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                WorldFeedback.emit(scope, dragondanceScene, 1, here.position(),
                    { moment: "settle", gyre: gyre, scale: scale, turns: turns, drakes: drakes, gift: gift,
                        intensity: Math.max(0.7, Math.min(2.2, (gift * 2 + turns) / 4)) }, 30);
                WorldFeedback.text(scope, here.position().plus(WorldCombat.point(0, 1.4, 0)), dragondanceText, [gift], 30);
                scope.sound("cobblemon:impact.dragon", here.position(), 18, "{}");
                finish(current);
            }
            function riseNow(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                const angle = (index + 1) * (Math.PI * 2) / turns;
                const at = here.position();
                const target = WorldCombat.point(home.x() + Math.sin(angle) * gyre, at.y(), home.z() + Math.cos(angle) * gyre);
                scope.displace(actor, WorldCombat.point(target.x() - at.x(), 0, target.z() - at.z()));
                if (soar && lift > 0) scope.motion(actor, WorldCombat.point(0, lift, 0), true);
                const now = scope.observe(actor), point = now === null ? at : now.position();
                WorldFeedback.emit(scope, dragondanceScene, 1, point,
                    { moment: "rise", gyre: gyre, scale: scale, turns: turns, index: index + 1, drakes: drakes,
                        soar: soar ? 1 : 0, soarMotes: soar ? Math.max(6, Math.round(drakes / 3)) : 0,
                        intensity: Math.max(0.6, Math.min(2.2, drakes / 28)) }, 22);
                scope.sound(index === 0 ? "minecraft:entity.ender_dragon.flap" : "minecraft:entity.ender_dragon.growl", point, 14, "{}");
                index++;
                if (index >= turns) { current.after(beat, land); return; }
                current.after(beat, riseNow);
            }
            riseNow(action);
        }
    });

    // 龙势窗口走完：把这段舞抬起的攻速等级原样收回（只收到各自当前持有的正等级）。
    WorldCombat.on("world_combat:move_dragondance/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== dragondanceAiry) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const levels = Math.max(1, Math.round(Number(data.amplifier) || 1));
        for (let index = 0; index < dragondanceStats.length; index++) {
            const stat = dragondanceStats[index];
            const loss = Math.min(levels, Math.max(0, dragondanceStage(world, actor, stat)));
            if (loss > 0) NativeEffects.boost(world, actor, stat, -loss);
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, dragondanceScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), dragondanceFadeText, [], 26);
    });
}
