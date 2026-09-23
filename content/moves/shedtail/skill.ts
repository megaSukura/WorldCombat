/**
 * 断尾 / shedtail 的出手方式与工作效果。
 *
 * 念头的形状（两幕 + 持续）：
 *  1) 断——支付一半最大生命，在自己原来的位置留下一条真实的尾巴（`WorldBodies` 自持实体，脑
 *     `world_combat:move/shedtail/tail`），自己沿选定的方向抽身离开；给施法者带上共享身份
 *     `world_combat:status/shed_tail`，只作为「这次已经断过尾」的短标记。
 *  2) 拖住——尾巴每 20 刻把牵引范围内的敌人重新引向自己（`world.target`），替撤走的施法者拖住追兵。
 *  3) 结束——尾巴被打碎（break）或时间走完（expire）：清掉身份、放出收尾画面。
 *
 * 尾巴属于它自己：施法者被收回、换手退场、区块卸载与重启都不再让它消失；它按自己的耐久挨打，到点或
 * 被打碎才结束。召回会带走施法者身上的短标记，但不会带走尾巴。召唤者（summoner）用于保留原生友敌关系；
 * 尾巴自身是独立实体，与施法者分开。
 *
 * 与同族的替身分开：替身是「你留下、影子挡在前面承伤」；断尾是「你走、尾巴留在原地把敌人引住」。
 * 提交前只观察并在 `windup` 预告；提交后才触碰世界。
 */
namespace PokemonSkills {
    const shedtailScene = "world_combat:move_shedtail";
    const shedtailTail = "world_combat:move/shedtail/tail";
    const shedtailStatus = "world_combat:shed_tail";
    const shedtailText = "world_combat.move.shedtail.text.shed";
    const shedtailBreakText = "world_combat.move.shedtail.text.break";
    const shedtailExpireText = "world_combat.move.shedtail.text.expire";
    const shedtailSwitchText = "world_combat.move.shedtail.text.switch";

    WorldBodies.define(shedtailTail, {
        schema: 1,
        maxTicks: 1200,
        start: function (brain) {
            const world = brain.world(), state = JSON.parse(brain.state());
            const body = world.observe(brain.target());
            if (body === null) return;
            state.point = [body.position().x(), body.position().y(), body.position().z()];
            brain.state(JSON.stringify(state));
            WorldFeedback.emit(world, shedtailScene, 1, body.position(), { moment: "shed", scale: state.appearance }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), shedtailText, [], 30);
            world.sound("minecraft:entity.sheep.shear", body.position(), 16, "{}");
            brain.schedule("lure", "lure", 20, "{}");
        },
        resume: function (brain) { brain.schedule("lure", "lure", 20, "{}"); },
        operations: { "world_combat:dispel": function (brain) { brain.end(); } },
        handlers: {
            lure: function (brain) {
                const world = brain.world(), state = JSON.parse(brain.state());
                const tail = world.observe(brain.target());
                if (tail === null) { brain.end(); return; }
                const centre = tail.position(), actors = world.query(centre, state.lureRange, false);
                let lured = 0;
                for (let index = 0; index < actors.length; index++) {
                    const other = actors[index], facts = world.observe(other);
                    if (String(other.ref()) === String(brain.target().ref())) continue;
                    if (facts === null || facts.friendly() || facts.health() <= 0) continue;
                    if (world.target(other, brain.target())) lured++;
                }
                WorldFeedback.keep(world, "world_combat:move_shedtail:lure", shedtailScene, 1, centre,
                    { moment: "lure", scale: state.lureRange / 8, intensity: Math.min(2, lured / 2), lured: lured }, 26);
                if (lured > 0) world.sound("minecraft:entity.phantom.flap", centre, 14, "{}");
                brain.schedule("lure", "lure", 20, "{}");
            }
        },
        end: function (brain) {
            const world = brain.world();
            let state: any = {};
            try { state = JSON.parse(brain.state()); } catch (error) { state = {}; }
            const caster = state.owner ? world.actor(state.owner) : null;
            if (caster !== null && world.valid(caster)) CombatStatus.cure(world, caster, "shed_tail");
            if (!state.point || state.point.length !== 3) return;
            const anchor = WorldCombat.point(state.point[0], state.point[1], state.point[2]);
            const broken = brain.reason() !== "expired";
            WorldFeedback.emit(world, shedtailScene, 1, anchor, { moment: broken ? "break" : "expire", scale: state.appearance }, 24);
            WorldFeedback.text(world, anchor.plus(WorldCombat.point(0, 1.1, 0)),
                broken ? shedtailBreakText : shedtailExpireText, [], 26);
            world.sound(broken ? "minecraft:block.slime_block.break" : "minecraft:block.beacon.deactivate", anchor, 16, "{}");
        }
    });

    define({
        freeMovement: true,
        id: "shedtail",
        name: "Shed Tail",
        description: "削掉自己一半生命，在原地留下一条会拖住敌人的尾巴，自己沿选定方向抽身离场；有后备时直接与待命的一只换手。尾巴在被打碎或自行消散前，会把附近的敌人重新引向尾巴。",
        uses: ["被打崩前脱身，把追兵留给一条尾巴", "在狭窄地形用尾巴堵住追路", "把敌人的目标从自己身上引开"],
        kind: "motion",
        range: 5,
        maxRange: 12,
        prepare: 10,
        active: 2,
        recover: 8,
        cooldown: 96,
        style: "contact",
        defaults: { ward: 1.0, ai: { reserveHealth: 0.15, release: "away", leaveStation: false } },
        fields: [
            field(pathOf("ward"), "尾巴厚度", "choice", { options: [
                { value: 0.6, label: "远遁" }, { value: 1.0, label: "标准" }, { value: 1.4, label: "保尾" }] })
        ],
        indicator: function (config) { return { radius: 5, geometry: "line", style: "contact", color: 0xB0705A, label: "断尾" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["shedtail"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const ward = Number(config && config.ward) || 1;
            return {
                prepare: p("shedtail", "prepare", context),
                recover: p("shedtail", "recover", context) + (ward <= 0.6 ? -2 : ward >= 1.4 ? 2 : 0),
                cooldown: Math.round(p("shedtail", "cooldown", context) * (ward <= 0.6 ? 0.88 : ward >= 1.4 ? 1.15 : 1)),
                range: p("shedtail", "retreat", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor(), body = world.observe(actor);
            if (body === null) return "target-left";
            if (MobEffects.read(world, actor, shedtailStatus) !== null) return "already-shed";
            const cost = body.maxHealth() * p("shedtail", "cost", action);
            const reserve = config && config.ai && config.ai.reserveHealth !== undefined ? Number(config.ai.reserveHealth) : 0.15;
            if (body.health() <= cost + body.maxHealth() * reserve) return "insufficient-health";
            const destination = action.targetPosition();
            if (destination.minus(action.origin()).length() > p("shedtail", "retreat", action) + 0.5) return "out-of-range";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_shedtail:windup", shedtailScene, 1, action.origin(),
                JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const cost = body.maxHealth() * p("shedtail", "cost", action);
            const paid = -world.health(actor, -cost, "world_combat:shedtail_cost");
            if (paid < 1) { done(action); return; }
            const origin = action.origin(), destination = action.targetPosition();
            const feet = WorldCombat.point(origin.x(), origin.y() - body.height() / 2, origin.z());
            let direction = destination.minus(origin);
            if (direction.length() < 0.01) direction = action.direction();
            direction = direction.length() < 0.01 ? WorldCombat.point(0, 0, 1) : direction.unit();
            const horizontal = WorldCombat.point(direction.x(), 0, direction.z());
            const retreat = p("shedtail", "retreat", action);
            const reach = Math.max(0, horizontal.length());
            const step = reach < 0.01 ? WorldCombat.point(0, 0, 0) : horizontal.unit().scale(Math.min(retreat, reach));
            const moved = world.teleport(actor, feet.plus(step));
            if (!moved) world.displace(actor, step);
            const tailRatio = p("shedtail", "tail", action);
            const tailHealth = Math.max(1, body.maxHealth() * tailRatio);
            const tailTicks = Math.max(1, Math.round(p("shedtail", "tailTicks", action)));
            const appearance = Math.max(0.5, Math.min(1.3, tailRatio / 0.25));
            WorldFeedback.emit(world, shedtailScene, 1, feet, { moment: "depart", direction: [horizontal.length() > 0 ? horizontal.unit().x() : 0, 0, horizontal.length() > 0 ? horizontal.unit().z() : 1] }, 24);
            world.sound("cobblemon:move.quickattack.actor", feet, 16, "{}");
            // 尾巴是自持实体：召唤者是施法者（保留原生友敌关系），但尾巴本身独立，召回不会带走它。
            let tail: CombatActor | null = null;
            try {
                tail = WorldBodies.spawn(world, feet, {
                    appearance: { item: "minecraft:rotten_flesh", scale: appearance },
                    size: [0.9, 0.9], health: tailHealth, speed: 0, gravity: false, pushable: false,
                    invulnerable: false, silent: true, knockbackResistance: 0.35
                }, shedtailTail, { owner: String(actor.ref()), point: [feet.x(), feet.y(), feet.z()],
                    lureRange: p("shedtail", "lureRange", action), appearance: appearance }, tailTicks);
            } catch (error) { tail = null; }
            if (tail === null) {
                if (world.valid(actor)) world.health(actor, paid, "world_combat:shedtail_refund");
                done(action);
                return;
            }
            MobEffects.apply(world, actor, shedtailStatus, tailTicks, 0);
            // 有合法后备时真正换手：收回自己、让后备在撤离落点登场，尾巴留在原地。
            const reserve = partyReserve(partyRoster(world, actor), partyActiveId(world, actor));
            if (reserve !== null) {
                WorldFeedback.text(world, feet.plus(step).plus(WorldCombat.point(0, 1.1, 0)), shedtailSwitchText, [], 26);
                partySwitchOut(world, actor, reserve.slot, feet.plus(step));
            }
            done(action);
        }
    });
}
