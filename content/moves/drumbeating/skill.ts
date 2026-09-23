/**
 * 鼓击 / drumbeating 的出手方式。
 *
 * 核心念头：敲响鼓，让根须跟着鼓点沿地面冲向目标——每一拍都是一道破土的波峰，前几拍把目标震得站不稳，
 * 最后一拍根须缠住它的腿脚，把它的动作拖住、速度压下去；破土而出的根留在原地，过一阵才缩回土里。
 *
 * 三幕：
 *   起（tune，提交前）：抬手落槌、在鼓面上聚起一圈音粒与草屑，只播预告。
 *   奏（wave → strike，提交后）：每 `interval` 刻一拍，波峰从脚下沿地面冲向目标；到达时在目标脚下破土，
 *       圈内敌人各吃一记 `beat`（前几拍）或 `final`（末拍）伤害。
 *   缠（bind → root）：末拍按 `slowStages` 压速度、挂 rootbound 身份、把腿脚别住一瞬，并在目标脚下留下 `rootCells` 块
 *       根系（`terrain` 租借、`linger`），到期原方块回来。
 *
 * 与本族其他三招分开：泥巴射击／下盘踢／虫扑都是接触或投射物；鼓击是唯一**不接触、走地面、分多拍**的一招，
 * 根须是真正留在世界里的东西。掉速走 `NativeEffects.boost` 的共享速度等级，对宝可梦和其他生物同一条路。
 */
namespace PokemonSkills {
    const drumbeatingScene = "world_combat:move_drumbeating";
    const drumbeatingBound = "world_combat:drumbeating_bound";
    const drumbeatingBindText = "world_combat.move.drumbeating.text.bind";
    const drumbeatingBeatText = "world_combat.move.drumbeating.text.beat";

    /** 在目标脚下按半径铺一圈根须；只放地表上方的空气格，到期原方块回来，活物站在格子里时等它走开再合上。 */
    function drumbeatingRoots(world: CombatWorld, point: CombatPoint, radius: number, cells: number, ticks: number): number {
        const placed: any[] = [];
        const r = Math.ceil(radius + 0.4), bx = Math.floor(point.x()), bz = Math.floor(point.z());
        for (let ring = 1; ring <= 2 && placed.length < cells; ring++) {
            const at = radius * (ring === 1 ? 0.55 : 1.0);
            const step = ring === 1 ? 4 : 6;
            for (let i = 0; i < step && placed.length < cells; i++) {
                const a = (i / step) * Math.PI * 2 + (ring === 1 ? 0.4 : 0);
                const x = bx + Math.round(Math.cos(a) * at), z = bz + Math.round(Math.sin(a) * at);
                for (let dy = 1; dy >= -3; dy--) {
                    const block = world.block(WorldCombat.point(x, Math.floor(point.y()) + dy, z));
                    if (block === null) continue;
                    const id = String(block.id());
                    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                    if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock") break;
                    const above = world.block(WorldCombat.point(x, Math.floor(point.y()) + dy + 1, z));
                    if (above === null) break;
                    const aboveId = String(above.id());
                    if (aboveId !== "minecraft:air" && aboveId !== "minecraft:short_grass" && aboveId !== "minecraft:tall_grass") break;
                    placed.push({ x: x, y: Math.floor(point.y()) + dy + 1, z: z, block: "minecraft:mangrove_roots" });
                    break;
                }
            }
        }
        if (!placed.length) return 0;
        try { world.terrain(JSON.stringify({ cells: placed, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return placed.length;
    }

    /** 末拍缠住一名目标：共享速度等级、rootbound 身份、短定身与脚下根须。 */
    function drumbeatingBind(world: CombatWorld, target: CombatActor, point: CombatPoint, stages: number,
        bindTicks: number, rootTicks: number, rootCells: number): void {
        NativeEffects.boost(world, target, "spe", -stages);
        MobEffects.apply(world, target, drumbeatingBound, bindTicks, 0);
        if (rootTicks > 0) WorldEffects.apply(world, target, "rooted", {}, rootTicks);
        const laid = drumbeatingRoots(world, point, 1.2, rootCells, bindTicks);
        world.sound("minecraft:block.mangrove_roots.place", point, 16, "{}");
        const body = world.observe(target);
        WorldFeedback.keep(world, "drumbeating:root:" + String(target.ref()), drumbeatingScene, 1,
            body === null ? point : body.position(),
            { moment: "root", target: String(target.ref()), stages: stages, cells: laid, tick: bindTicks }, bindTicks);
        if (body !== null) {
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), drumbeatingBindText, [stages], 30);
        }
    }

    define({
        id: "drumbeating",
        name: "Drum Beating",
        description: "敲响鼓，让根须跟着鼓点沿地面冲向目标：每一拍都是一道破土的波峰，前几拍隔着地面造成伤害，最后一拍根须缠住它的腿脚，把目标钉住一瞬并压低速度；破土而出的根留在原地，过一阵才缩回土里。深根式根留得更久、多压一级速度、破土更宽，每拍更轻。",
        uses: ["隔着地面钉住一个对手", "连奏数拍逐拍造成伤害，末拍再压低速度、钉住腿脚", "在目标脚下留下一圈根须"],
        kind: "enemy",
        range: 11,
        maxRange: 11,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 44,
        style: "grass",
        defaults: { deep: false, ai: { maxChase: 13, pinRunners: true } },
        fields: [
            flag("deep", "深根")
        ],
        indicator: function (config, pokemon) {
            return { radius: p("drumbeating", "beatRadius", pokemon), geometry: "area", style: "grass",
                color: 0x7CB342, label: config && config.deep === true ? "鼓击·深根" : "鼓击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["drumbeating"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const deep = !!(config && config.deep);
            return { prepare: Math.round(p("drumbeating", "tempo", context)), recover: 10 + (deep ? 3 : 0),
                cooldown: 44 + (deep ? 8 : 0), active: 0, range: p("drumbeating", "reach", context) };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_drumbeating:tune", drumbeatingScene, 1, action.origin(),
                JSON.stringify({ moment: "tune", deep: config && config.deep ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const beatPower = p("drumbeating", "beat", action);
            const finalPower = p("drumbeating", "final", action);
            const beats = Math.max(3, Math.min(4, Math.round(p("drumbeating", "beats", action))));
            const interval = Math.max(4, Math.round(p("drumbeating", "interval", action)));
            const reach = p("drumbeating", "reach", action);
            const pace = Math.max(0.3, p("drumbeating", "wavePace", action));
            const beatRadius = p("drumbeating", "beatRadius", action);
            const stages = Math.max(1, Math.round(p("drumbeating", "slowStages", action)));
            const bindTicks = Math.max(40, Math.round(p("drumbeating", "bindTicks", action)));
            const rootTicks = Math.max(0, Math.round(p("drumbeating", "rootTicks", action)));
            const rootCells = Math.max(4, Math.round(p("drumbeating", "rootCells", action)));
            const notes = Math.max(8, Math.round(p("drumbeating", "notes", action)));
            const scale = beatRadius / 1.1;
            const targetRef = action.target() === null ? "" : String(action.target()!.ref());
            const locked = action.targetPosition();
            let settled = false;
            const feetOf = (height: number, point: CombatPoint) => point.minus(WorldCombat.point(0, height / 2, 0));
            sound(action, "cobblemon:move.leafstorm.actor");

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 一拍：波峰沿地面冲向目标；`travel` 刻后在目标脚下破土。 */
            function beatAt(current: CombatAction, index: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const feet = feetOf(self.height(), self.position());
                const live = targetRef === "" ? null : scope.actor(targetRef);
                const liveBody = live === null ? null : scope.observe(live);
                const ground = liveBody === null ? locked.minus(WorldCombat.point(0, 0.7, 0)) : feetOf(liveBody.height(), liveBody.position());
                const horizontal = Math.sqrt(Math.pow(feet.x() - ground.x(), 2) + Math.pow(feet.z() - ground.z(), 2));
                const travel = Math.max(2, Math.min(9, Math.round(horizontal / pace)));
                const final = index >= beats - 1;
                WorldFeedback.emit(scope, drumbeatingScene, 1, feet,
                    { moment: "wave", beat: index + 1, beats: beats, notes: notes, scale: scale, final: final ? 1 : 0,
                        path: [[feet.x(), feet.y(), feet.z()], [ground.x(), ground.y(), ground.z()]] }, travel + 10);
                sound(current, "minecraft:block.note_block.basedrum");
                current.after(travel, function (next: CombatAction) { strikeAt(next, index, ground, live, final); });
            }

            /** 波峰到达：破土结算这一拍。 */
            function strikeAt(current: CombatAction, index: number, point: CombatPoint, live: CombatActor | null, final: boolean): void {
                const scope = current.world();
                const power = final ? finalPower : beatPower;
                const intensity = Math.max(0.6, Math.min(2.2, power / 50));
                let struck = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, Math.max(0.8, beatRadius), { below: 1.6, above: 1.6 }),
                    function (other, facts) {
                        if (struck >= 3) return;
                        struck++;
                        const landed = hurt(current, other, "drumbeating", power,
                            { damage: damageSpec("drumbeating", final ? "final" : "beat") });
                        WorldFeedback.emit(scope, drumbeatingScene, 1, facts.position(),
                            { moment: "strike", target: String(other.ref()), beat: index + 1, beats: beats, notes: notes,
                                final: final ? 1 : 0, intensity: intensity, scale: scale }, 26);
                        if (final && landed && scope.valid(other)) drumbeatingBind(scope, other, facts.position(), stages, bindTicks, rootTicks, rootCells);
                    });
                if (struck === 0 && final) {
                    WorldFeedback.emit(scope, drumbeatingScene, 1, point, { moment: "miss", notes: notes, scale: scale }, 22);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), drumbeatingBeatText, [], 22);
                }
                if (final) { finish(current); return; }
                current.after(interval, function (next: CombatAction) { beatAt(next, index + 1); });
            }

            beatAt(action, 0);
        }
    });
}
