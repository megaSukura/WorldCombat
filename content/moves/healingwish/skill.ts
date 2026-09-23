/**
 * 治愈之愿 / Healing Wish —— 执行组织。
 *
 * 核心念头：把自己整个交出去，在倒下的地方留下一颗治愈之愿；愿望等着，第一个来到它身边、又伤又病的伙伴
 *   被整口治好——按最大生命回复，并洗掉全部有害状态效果。这是本家族里唯一**以命换命**的一招：不净化别人，
 *   而是把自己变成一次救援。
 *
 * 两幕（加愿景自身的一段等待）：
 *   起（windup，提交前）：半跪合掌，周身升起愿光；只观察与预告，可被打断（此时不会倒下）。
 *   献（提交后）：把自己当前生命全部交出去（倒下），原地放出一颗独立的愿星（WorldBodies 持久实体，
 *     脑 world_combat:move/healingwish/wish）。愿望不受施法者被收回、区块卸载与重启影响。
 *   兑（愿星期内）：愿星每 4 刻检查半径内是否有「受伤或有有害状态效果」的友善伙伴（不含自己）；有就整口治好、
 *     洗掉异常，随即散去；到点无人需要就自行散去（fade）。
 *
 * 反制：愿望只认「走到它身边的第一个需要救助的人」——把残血伙伴带离愿望、或先让自己人占掉它即可；
 *   愿望有时间限制，等待期本身就是对手的余地。附近一个可接收的伙伴都没有时，许愿者不会倒下（忠实原生 ifHit）。
 * 宝可梦层：治好与洗掉都走共享默认效果，原生队伍面板随之同步；本招不新增状态。
 */
namespace PokemonSkills {
    function healingwishAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    /** 受益者是否「需要」这次愿望：受伤或带有害状态效果。健康且干净的人不会被消耗掉愿望。 */
    function healingwishNeeds(world: CombatWorld, actor: CombatActor, facts: CombatObservation): boolean {
        if (facts.health() < facts.maxHealth() - 0.01) return true;
        return CombatStatus.hasHarmful(world, actor);
    }

    /** 半径内是否至少有一个「可接收」的友善战斗者（不含自己）；没有就不该交出生命（原生 ifHit）。 */
    function healingwishAnyFriend(world: CombatWorld, point: CombatPoint, radius: number, owner: string): boolean {
        var near = world.query(point, radius, false);
        for (var index = 0; index < near.length; index++) {
            var other = near[index];
            if (String(other.ref()) === owner || !world.friendly(other)) continue;
            var facts = world.observe(other);
            if (facts !== null && facts.health() > 0) return true;
        }
        return false;
    }

    /** 阵营快照：愿星不属于原施法者的阵营，所以在交出生命前先记下「谁是自己人」与阵营名。 */
    function healingwishTeam(world: CombatWorld, actor: CombatActor): string {
        var entity = world.nativeEntity(actor);
        if (entity === null || typeof entity.getTeam !== "function") return "";
        var team = entity.getTeam();
        return team === null || team === undefined ? "" : String(team.getName());
    }

    function healingwishAllySet(world: CombatWorld, owner: CombatActor, point: CombatPoint): { [ref: string]: boolean } {
        var set: { [ref: string]: boolean } = Object.create(null), near = world.query(point, 16, false);
        for (var index = 0; index < near.length; index++) {
            var other = near[index];
            if (String(other.ref()) === String(owner.ref())) continue;
            if (world.friendly(other)) set[String(other.ref())] = true;
        }
        return set;
    }

    /** 洗掉一个战斗者身上的全部有害状态效果，返回实际洗掉的项数。 */
    function healingwishCleanse(world: CombatWorld, actor: CombatActor): number {
        return CombatStatus.cureHarmful(world, actor);
    }

    /** 回复走共享健康写入；宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者直接写 MC 生命。 */
    function healingwishHeal(world: CombatWorld, target: CombatActor, amount: number, cause: string): number {
        var body = world.observe(target);
        if (body === null) return 0;
        var missing = body.maxHealth() - body.health();
        if (missing <= 0 || amount <= 0) return 0;
        var healed = 0;
        if (String(target.domain()) === "cobblemon" && world.valid(target)) {
            var pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, target, pokemon, Math.min(missing, amount) / scale, cause);
        } else {
            healed = world.health(target, Math.min(missing, amount), "world_combat:" + cause);
        }
        var after = world.observe(target);
        if (healed > 0 && after) feedback(world, target, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    /** 等待期的一帧画面：只续播等待表现，不结算、不结束。`start` 里结束会让 body 生成失败（见下）。 */
    function healingwishAwait(brain: CombatEffect): void {
        var world = brain.world(), state = JSON.parse(brain.state());
        var centre = WorldCombat.point(state.ground[0], state.ground[1], state.ground[2]);
        var scale = Math.max(0.6, Math.min(2.0, state.radius / healingwishReferenceRadius));
        WorldFeedback.keep(world, "healingwish:wait:" + String(brain.target().ref()), healingwishScene, 1, centre,
            { moment: "wait", radius: state.radius, motes: state.motes, scale: scale, owner: state.owner }, 16);
    }

    /**
     * 愿星的一次检查：续播等待画面；找到需要救助的伙伴就兑现，随即散去。
     * 只在周期刻度与重启恢复里调用：`start` 必须在返回前保持存活，否则 WorldBodies 在 start 之后
     * 为周期刻度补排定时器时会因效果已结束而抛错，连带让召唤它的这次施放作废。
     */
    function healingwishPulse(brain: CombatEffect): void {
        var world = brain.world(), at = world.observe(brain.target());
        if (at === null) { brain.end(); return; }
        var state = JSON.parse(brain.state());
        var centre = WorldCombat.point(state.ground[0], state.ground[1], state.ground[2]);
        var scale = Math.max(0.6, Math.min(2.0, state.radius / healingwishReferenceRadius));
        healingwishAwait(brain);
        var near = world.query(centre, state.radius, false);
        for (var index = 0; index < near.length; index++) {
            var other = near[index];
            var ref = String(other.ref());
            if (ref === String(brain.target().ref()) || ref === String(state.owner)) continue;
            var allied = !!(state.allies && state.allies[ref]);
            if (!allied && state.team) allied = healingwishTeam(world, other) === String(state.team);
            if (!allied) continue;
            var facts = world.observe(other);
            if (facts === null || facts.health() <= 0 || !healingwishNeeds(world, other, facts)) continue;
            var healed = healingwishHeal(world, other, facts.maxHealth() * state.fraction, "healingwish");
            var removed = healingwishCleanse(world, other);
            world.sound("minecraft:entity.player.levelup", facts.position(), 16, "{}");
            WorldFeedback.emit(world, healingwishScene, 1, facts.position(),
                { moment: "deliver", target: String(other.ref()), motes: state.motes, radius: state.radius, scale: scale,
                    healed: Math.round(healed * 10) / 10, removed: removed,
                    intensity: Math.max(0.7, Math.min(2.0, 0.6 + state.fraction)) }, 40);
            WorldFeedback.text(world, healingwishAbove(facts.position()), healingwishDeliverText,
                [Math.round(healed * 10) / 10, removed], 34);
            state.delivered = true; brain.state(JSON.stringify(state));
            brain.end();
            return;
        }
    }

    WorldBodies.define(healingwishWishBrain, {
        schema: 1,
        maxTicks: 600,
        start: function (brain) { healingwishAwait(brain); },
        resume: function (brain) { healingwishPulse(brain); },
        tick: { every: 4, handler: function (brain) { healingwishPulse(brain); } },
        end: function (brain) {
            var state: any = {};
            try { state = JSON.parse(brain.state()); } catch (error) { state = {}; }
            if (state.delivered) return;
            var world = brain.world(), at = world.observe(brain.target());
            if (at === null) return;
            var ground = WorldCombat.point(state.ground ? state.ground[0] : 0, state.ground ? state.ground[1] : 0, state.ground ? state.ground[2] : 0);
            world.presentFor("healingwish:fade:" + String(brain.target().ref()), healingwishScene, 1, ground,
                JSON.stringify({ moment: "fade", motes: state.motes, radius: state.radius,
                    scale: Math.max(0.6, Math.min(2.0, (state.radius || 3) / healingwishReferenceRadius)) }), 24);
        }
    });

    define({
        id: healingwishId,
        cooldownParameter: "recharge", name: "治愈之愿",
        description: "把自己整个交出去：当场倒下，在倒下的地方留下一颗愿星。愿望会等一段时间，第一个来到它身边、又伤又病的伙伴（受伤或带有害状态效果）按其最大生命的比例回复并洗掉全部有害状态效果；无人需要时愿望自行散去。附近没有可接收的伙伴时，许愿者不会倒下。",
        uses: ["残血时把命换成伙伴的一次满血重生", "在必死前为缠斗中的伙伴留一颗愿望", "把倒下的地方变成一处救援点"],
        kind: "self", range: 0, prepare: 14, active: 1, recover: 0, cooldown: 320, style: "wish", maximumTicks: 300,
        defaults: { broadcast: false },
        fields: [flag("broadcast", "广愿")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[healingwishId], detail: { values: config } };
            return { radius: p(healingwishId, "wishReach", context), geometry: "circle", style: "wish", color: 0xFFD36A,
                label: config && config.broadcast === true ? "治愈之愿 · 广愿" : "治愈之愿 · 专愿" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[healingwishId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(healingwishId, "tempo", context)),
                recover: Math.round(p(healingwishId, "aftercast", context)),
                cooldown: Math.round(p(healingwishId, "recharge", context)),
                active: 1, range: 0
            };
        },
        ready: function (action, _config) {
            const world = action.sense(), self = action.actor(), body = world.observe(self);
            if (body === null) return "invalid-target";
            const radius = Math.max(1.5, p(healingwishId, "wishReach", action));
            return healingwishAnyFriend(world, body.position(), radius, String(self.ref())) ? "" : "no-one-to-receive";
        },
        windup: function (action, config, prepare) {
            action.present("healingwish:windup", healingwishScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(action.actor().ref()),
                    motes: p(healingwishId, "motes", action), broadcast: config && config.broadcast === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const feet = body.position();
            const radius = Math.max(1.5, p(healingwishId, "wishReach", action));
            const fraction = Math.max(0, Math.min(1, p(healingwishId, "wishHeal", action)));
            const wait = Math.max(60, Math.round(p(healingwishId, "wishWait", action)));
            const motes = Math.max(12, Math.round(p(healingwishId, "motes", action)));
            const scale = Math.max(0.6, Math.min(2.0, radius / healingwishReferenceRadius));
            if (!healingwishAnyFriend(world, feet, radius, String(self.ref()))) {
                WorldFeedback.emit(world, healingwishScene, 1, feet, { moment: "wasted", target: String(self.ref()), motes: motes }, 22);
                WorldFeedback.text(world, healingwishAbove(feet), healingwishWasteText, [], 26);
                done(action); return;
            }
            const at = feet.plus(WorldCombat.point(0, 0.9, 0));
            const allies = healingwishAllySet(world, self, feet), team = "";
            WorldBodies.spawn(world, at,
                { size: [0.6, 0.9], health: 8, gravity: false, pushable: false, invulnerable: true, silent: true,
                    knockbackResistance: 1, glow: true,
                    appearance: { sprite: "cobblemon:moves/wish_star", scale: 1.0, tint: 0xFFD36A, glow: true } },
                healingwishWishBrain,
                { owner: String(self.ref()), radius: radius, fraction: fraction, motes: motes,
                    ground: [feet.x(), feet.y(), feet.z()], allies: allies, team: team, delivered: false }, wait + 40);
            WorldFeedback.emit(world, healingwishScene, 1, at,
                { moment: "offer", target: String(self.ref()), motes: motes, radius: radius, scale: scale }, 34);
            WorldFeedback.text(world, healingwishAbove(at), healingwishOfferText, [Math.round(wait / 20)], 34);
            const last = world.observe(self);
            if (last !== null) world.health(self, -last.health(), "world_combat:healingwish_cost");
            done(action);
        }
    });
}
