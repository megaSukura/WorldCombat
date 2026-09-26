/**
 * 祈愿 / Wish —— 执行组织。
 *
 * 核心念头：点一块空地做愿星落点，把星送上高空；倒计时里它沿着与地面的连线慢慢落向那块地，兑现时只有真正
 *   站在落点圈里的友善战斗者接到祝福——施法者走远也接不到，换人登场只要站在圈里就自然接过。
 *
 * 出手：共享节奏。windup 在所选落点收拢祈愿的光；提交后在世界里放出一只属于自己的愿星（WorldBodies 持久
 *   实体，脑 world_combat:move/wish/star），落点就是所选的那块合法地面（不能选进墙里）。
 * 结果：愿星悬停 delayTicks 后落下，为落点圈内每个友善战斗者分别回复其最大生命的一个比例。开启分享时施法者
 *   与伙伴各按摊薄比例；关闭分享时只有施法者按满额。愿星独立于施法动作，施法者被收回、区块卸载、服务器重启
 *   都不影响它；它按自己的延迟兑现后自行散去，圈里无人需要就消散。
 * 反制：延迟与落点本身就是余地——对手可以在兑现前把人推出圈或把残血的人移走；施法者自己走出圈也收不到。
 */
namespace PokemonSkills {
    const wishScene = "world_combat:move_wish";
    const wishTextRise = "world_combat.move.wish.text.rise";
    const wishTextLanded = "world_combat.move.wish.text.landed";
    const wishTextWasted = "world_combat.move.wish.text.wasted";
    const wishStarBrain = "world_combat:move/wish/star";
    const wishReferenceRadius = 2.6;
    const wishGroundDrop = 4;

    function wishAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.8, 0)); }

    /** 所选落点是否是一块可站的地面：往下找到实心方块，且落点那格是空的；墙内、水与岩床都拒绝。 */
    export function wishSpot(world: CombatWorld, point: CombatPoint): CombatPoint | null {
        var x = Math.floor(point.x()), y = Math.floor(point.y()), z = Math.floor(point.z());
        for (var dy = 0; dy >= -wishGroundDrop; dy--) {
            var probe = world.block(WorldCombat.point(x, y + dy, z));
            if (probe === null) return null;
            var id = String(probe.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") return null;
            var landing = WorldCombat.point(x + 0.5, y + dy + 1, z + 0.5);
            var above = world.block(landing);
            if (above === null) return null;
            var aboveId = String(above.id());
            return aboveId === "minecraft:air" || aboveId === "minecraft:cave_air" || aboveId === "minecraft:void_air" ? landing : null;
        }
        return null;
    }

    function wishHeal(world: CombatWorld, target: CombatActor, amount: number, cause: string): number {
        if (amount <= 0 || !world.valid(target)) return 0;
        var healed = 0;
        if (String(target.domain()) === "cobblemon") {
            var pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, target, pokemon, amount / scale, cause);
        } else {
            healed = world.health(target, amount, "world_combat:" + cause);
        }
        var after = world.observe(target);
        if (healed > 0 && after) feedback(world, target, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    function wishState(brain: CombatEffect): any { return JSON.parse(brain.state()); }

    function wishStarSchedule(brain: CombatEffect): void {
        var world = brain.world(), state = wishState(brain), remaining = state.landAt - world.tick();
        brain.unschedule("wish:land");
        brain.unschedule("wish:fall");
        brain.schedule("wish:land", "land", Math.max(1, remaining), "{}");
        brain.schedule("wish:fall", "fall", Math.max(1, remaining - 14), "{}");
    }

    /** 愿星这一刻的画面数据：星沿连线落向落点，剩余高度换算成 fallY，供判定与表现共用同一位置。 */
    function wishStarData(brain: CombatEffect): any | null {
        var world = brain.world(), at = world.observe(brain.target());
        if (!at) return null;
        var state = wishState(brain), foot = at.position();
        var start = Number(state.start) || state.landAt, span = Math.max(0.5, Number(state.hang) || 0);
        var progress = state.landAt > start ? Math.max(0, Math.min(1, (world.tick() - start) / (state.landAt - start))) : 0;
        var fallY = -span * progress;
        return { target: String(brain.target().ref()), owner: state.owner, point: state.ground,
            scale: state.radius / state.reference, fallY: fallY, span: span * (1 - progress), fall: progress,
            path: [[foot.x(), foot.y() + fallY, foot.z()], state.ground] };
    }

    function wishStarPulse(brain: CombatEffect, moment: string): void {
        var world = brain.world(), at = world.observe(brain.target());
        if (!at) return;
        var data = wishStarData(brain);
        if (!data) return;
        data.moment = moment;
        if (moment === "rise")
            WorldFeedback.emit(world, wishScene, 1, at.position(), data, 30);
        else
            WorldFeedback.keep(world, "wish:hang:" + String(brain.target().ref()), wishScene, 1, at.position(), data, 30);
    }

    function wishStarFall(brain: CombatEffect): void {
        var world = brain.world(), at = world.observe(brain.target());
        if (!at) return;
        var data = wishStarData(brain);
        if (!data) return;
        data.moment = "fall";
        WorldFeedback.emit(world, wishScene, 1, at.position(), data, 26);
    }

    function wishStarLand(brain: CombatEffect): void {
        var world = brain.world(), at = world.observe(brain.target());
        if (!at) { brain.end(); return; }
        var state = wishState(brain);
        var center = WorldCombat.point(state.ground[0], state.ground[1], state.ground[2]);
        var fraction = Math.max(0, Math.min(1, state.fraction));
        var ownerRef = String(state.owner);
        function applyOne(target: CombatActor, scale: number): number {
            var body = world.observe(target);
            if (!body || body.health() <= 0 || body.health() >= body.maxHealth() - 0.01) return 0;
            return wishHeal(world, target, body.maxHealth() * fraction * scale, "wish");
        }
        // 只按落点圈筛选：施法者与友方同一套判定，谁站在圈里谁接；没人接就落空。
        var healed = 0, found = world.query(center, state.radius, false);
        for (var i = 0; i < found.length; i++) {
            var other = found[i];
            if (!world.valid(other) || !world.friendly(other)) continue;
            var isOwner = String(other.ref()) === ownerRef;
            var scale = state.share ? state.shareScale : (isOwner ? 1 : 0);
            if (!(scale > 0)) continue;
            var gain = applyOne(other, scale);
            if (!(gain > 0)) continue;
            healed++;
            var facts = world.observe(other);
            if (facts) WorldFeedback.emit(world, wishScene, 1, facts.position(),
                { moment: "heal", target: String(other.ref()), owner: ownerRef, scale: state.radius / state.reference,
                    amount: Math.round(gain * 10) / 10 }, 26);
        }
        var data = { moment: "land", target: String(brain.target().ref()), owner: ownerRef,
            count: healed, scale: state.radius / state.reference, burst: Math.round(14 + healed * 14) };
        world.sound("minecraft:entity.player.levelup", center, 16, "{}");
        WorldFeedback.emit(world, wishScene, 1, center, data, 40);
        WorldFeedback.text(world, wishAbove(center), healed > 0 ? wishTextLanded : wishTextWasted, [], 30);
        brain.end();
    }

    WorldBodies.define(wishStarBrain, {
        schema: 1,
        maxTicks: 600,
        start: function (brain) { wishStarPulse(brain, "rise"); wishStarSchedule(brain); },
        resume: function (brain) { wishStarSchedule(brain); },
        tick: { every: 4, handler: function (brain) { wishStarPulse(brain, "hang"); } },
        handlers: { land: function (brain) { wishStarLand(brain); }, fall: function (brain) { wishStarFall(brain); } },
        end: function (brain) {
            var state: any = {};
            try { state = JSON.parse(brain.state()); } catch (error) { state = {}; }
            var world = brain.world(), at = world.observe(brain.target());
            var ground = state.ground ? WorldCombat.point(state.ground[0], state.ground[1], state.ground[2]) : (at ? at.position() : null);
            if (ground) world.presentFor("wish:end:" + String(brain.target().ref()), wishScene, 1, ground,
                JSON.stringify({ moment: "fade", target: String(brain.target().ref()) }), 24);
        }
    });

    define({
        id: wishId, name: "祈愿",
        description: "点一块空地放下愿星，延迟片刻后愿星落回那块地，为落点圈内的友善战斗者各回复其最大生命的一个比例。愿星独立存在，施放者走远就收不到；圈里无人需要则愿力落空。",
        uses: ["提前在安全的落点布一个延迟治疗", "与伙伴分享愿力：落点圈内每人各得基础治疗量的六成（不是按人数均分）", "把落点放在队友脚下，让换人登场的伙伴接住"],
        kind: "point", range: 9, maxRange: 16, prepare: 16, active: 0, recover: 12, cooldown: 240, style: "wish", maximumTicks: 400,
        defaults: { share: false },
        fields: [flag("share", "与伙伴分享")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(wishId, "wishRadius", pokemon) : wishReferenceRadius, geometry: "area", style: "wish",
                color: 0xFFD36A, label: config && config.share === true ? "分享祈愿" : "自我祈愿" };
        },
        resolve: function (pokemon, config, world, actor) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[wishId], detail: { values: config }, world: world || null, actor: actor || null };
            return { prepare: p(wishId, "prepare", context), recover: p(wishId, "recover", context), cooldown: p(wishId, "cooldown", context),
                active: 0, range: p(wishId, "reach", context) };
        },
        ready: function (action) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            if (!body) return "invalid-target";
            return wishSpot(world, action.targetPosition()) ? "" : "invalid-target";
        },
        windup: function (action, _config, prepare) {
            var point = action.targetPosition();
            action.present("wish:windup", wishScene, 1, point,
                JSON.stringify({ moment: "windup", target: String(action.actor().ref()), point: [point.x(), point.y(), point.z()] }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var spot = wishSpot(world, action.targetPosition());
            if (!spot) { WorldFeedback.emit(world, wishScene, 1, body.position(), { moment: "fade", target: String(self.ref()) }, 24); done(action); return; }
            var share = config.share === true;
            var radius = p(wishId, "wishRadius", action), delay = Math.max(1, Math.round(p(wishId, "delayTicks", action)));
            var hang = p(wishId, "hangHeight", action);
            var start = world.tick();
            var at = spot.plus(WorldCombat.point(0, hang, 0));
            var state = { owner: String(self.ref()), radius: radius, reference: wishReferenceRadius,
                fraction: p(wishId, "wishHeal", action), share: share, shareScale: p(wishId, "shareScale", action),
                ground: [spot.x(), spot.y(), spot.z()], hang: hang, start: start, landAt: start + delay };
            sound(action, "minecraft:block.amethyst_block.chime");
            WorldBodies.spawn(world, at, { size: [0.6, 0.6], health: 8, gravity: false, pushable: false,
                invulnerable: true, silent: true, knockbackResistance: 1 }, wishStarBrain, state, delay + 120);
            WorldFeedback.text(world, at, wishTextRise, [], 30);
            done(action);
        }
    });
}
