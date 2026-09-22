/**
 * 祈愿 / Wish —— 执行组织。
 *
 * 核心念头：把一颗愿星送上高空，过一段时间它落回原处，为圈里的自己与伙伴兑现一次祝福。
 *
 * 出手：共享节奏。windup 在脚下收拢祈愿的光；提交后在世界里放出一只属于自己的愿星（WorldBodies 持久实体，
 *   脑 world_combat:move/wish/star）。
 * 结果：愿星悬停 delayTicks 后落下，为施法者按 wishHeal 回复，并在开启分享时治疗圈内的友善战斗者（比例摊薄
 *   为 shareScale）。愿星独立于施法动作，施法者被收回、区块卸载、服务器重启都不影响它；它按自己的延迟兑现后
 *   自行散去。
 * 反制：延迟本身就是余地——对手可以在兑现前干掉残血的施法者或把他推出圈；分享档虽然能救伙伴，但自己也只拿
 *   到摊薄后的比例。
 */
namespace PokemonSkills {
    const wishScene = "world_combat:move_wish";
    const wishTextRise = "world_combat.move.wish.text.rise";
    const wishTextLanded = "world_combat.move.wish.text.landed";
    const wishTextWasted = "world_combat.move.wish.text.wasted";
    const wishStarBrain = "world_combat:move/wish/star";
    const wishReferenceRadius = 2.6;

    function wishAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.8, 0)); }

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

    function wishStarFall(brain: CombatEffect): void {
        var world = brain.world(), at = world.observe(brain.target()), state = wishState(brain);
        if (!at) return;
        WorldFeedback.emit(world, wishScene, 1, at.position(),
            { moment: "fall", target: String(brain.target().ref()), owner: state.owner, scale: state.radius / state.reference }, 26);
    }

    function wishStarPulse(brain: CombatEffect, moment: string): void {
        var world = brain.world(), at = world.observe(brain.target());
        if (!at) return;
        var state = wishState(brain);
        var data = { moment: moment, target: String(brain.target().ref()), owner: state.owner,
            point: state.ground, scale: state.radius / state.reference };
        if (moment === "rise")
            WorldFeedback.emit(world, wishScene, 1, at.position(), data, 30);
        else
            WorldFeedback.keep(world, "wish:hang:" + String(brain.target().ref()), wishScene, 1, at.position(), data, 30);
    }

    function wishStarLand(brain: CombatEffect): void {
        var world = brain.world(), at = world.observe(brain.target());
        if (!at) { brain.end(); return; }
        var state = wishState(brain);
        var center = WorldCombat.point(state.ground[0], state.ground[1], state.ground[2]);
        var fraction = Math.max(0, Math.min(1, state.fraction));
        var owner = world.actor(state.owner);
        function applyOne(target: CombatActor, scale: number): boolean {
            var body = world.observe(target);
            if (!body || body.health() <= 0 || body.health() >= body.maxHealth() - 0.01) return false;
            var gain = body.maxHealth() * fraction * scale;
            return wishHeal(world, target, gain, "wish") > 0;
        }
        var healed = 0;
        if (owner && world.valid(owner) && applyOne(owner, state.share ? state.shareScale : 1)) healed++;
        if (state.share) {
            var found = world.query(center, state.radius, false);
            for (var i = 0; i < found.length; i++) {
                var other = found[i];
                if (String(other.ref()) === state.owner || !world.friendly(other)) continue;
                if (applyOne(other, state.shareScale)) healed++;
            }
        }
        var data = { moment: "land", target: String(brain.target().ref()), owner: state.owner,
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
            var world = brain.world(), at = world.observe(brain.target());
            if (at) world.presentFor("wish:end:" + String(brain.target().ref()), wishScene, 1, at.position(),
                JSON.stringify({ moment: "fade", target: String(brain.target().ref()) }), 24);
        }
    });

    define({
        id: wishId, name: "祈愿",
        description: "把一颗愿星送上高空，延迟片刻后落回原处，为自己回复最大生命的一半；开启分享时，圈内的友善伙伴也各按摊薄后的比例回复。愿星独立存在，施法者离开也在原地等待兑现。",
        uses: ["提前布下一个延迟治疗", "在措手不及时续命", "与伙伴分享愿力（分摊比例）"],
        kind: "self", range: 0, prepare: 16, active: 0, recover: 12, cooldown: 240, style: "wish", maximumTicks: 400,
        defaults: { share: false },
        fields: [flag("share", "与伙伴分享")],
        indicator: function (config) { return { radius: 1, style: "wish", label: config.share === true ? "分享祈愿" : "自我祈愿" }; },
        resolve: function (pokemon, config, world, actor) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[wishId], detail: { values: config }, world: world || null, actor: actor || null };
            return { prepare: p(wishId, "prepare", context), recover: p(wishId, "recover", context), cooldown: p(wishId, "cooldown", context), active: 0, range: 0 };
        },
        ready: function (action) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            return !body ? "invalid-target" : "";
        },
        windup: function (action, _config, prepare) {
            action.present("wish:windup", wishScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var share = config.share === true;
            var radius = p(wishId, "wishRadius", action), delay = Math.max(1, Math.round(p(wishId, "delayTicks", action)));
            var hang = p(wishId, "hangHeight", action);
            var feet = body.position();
            var at = feet.plus(WorldCombat.point(0, hang, 0));
            var state = { owner: String(self.ref()), radius: radius, reference: wishReferenceRadius,
                fraction: p(wishId, "wishHeal", action), share: share, shareScale: p(wishId, "shareScale", action),
                ground: [feet.x(), feet.y(), feet.z()], landAt: world.tick() + delay };
            sound(action, "minecraft:block.amethyst_block.chime");
            WorldBodies.spawn(world, at, { size: [0.6, 0.6], health: 8, gravity: false, pushable: false,
                invulnerable: true, silent: true, knockbackResistance: 1 }, wishStarBrain, state, delay + 120);
            WorldFeedback.text(world, at, wishTextRise, [], 30);
            done(action);
        }
    });
}
