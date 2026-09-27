/**
 * 超级角击 / megahorn 的出手方式。
 *
 * 核心念头：**低头刨地蓄足势，然后沿一条又长又窄的直线把角狠狠送进去**——全族最长、最重、起手最久的一记重刺。
 * 正面只有一条很窄的角线，侧身站开或趁蓄势走开就能让这一记落空；扎中最前面那个目标后：
 *   深植式把角留在伤口里、目标被短暂钉住（减速）；甩角式第二拍把角猛甩出来，补一记并把目标向上向后抛飞。
 *
 * 三幕：
 *   起（windup，提交前）：低头、后腿刨地、角尖压低，只播预告；这段时间可被打断，也是对手的闪避窗口。
 *   刺（thrust）：提交后朝前趟出 `rush` 格——身体用真实扫掠前移，撞到目标身体或障碍就停在接触处；再沿瞄准方向
 *       的**真实三维**角线走出 `reach` 格长、`horn` 半宽，先由 `blockHit` 在真实墙面截断，再取首个接触的目标
 *       结算 `gore` 接触伤害。角尖在真实接触点停，墙上硬碰另有回执。
 *   收（pin 或 toss）：深植式给目标挂 `minecraft:slowness`，并把「留刺」表现绑在这次减速 carrier 的托管 mark 上，
 *       减速被净化、替换或到期时留刺随之收起；甩角式延迟第二拍，只在 `hurt` 真正成功后补 `rip` 并挑飞目标。
 *      第二拍只对那个首个命中者、且它仍在近距并保持通视时结算；目标走开或被墙挡住就收角（whiff），刺伤已结清。
 *      挑飞只在实际被推动的人身上显示：免疫击退的目标保留刺伤、不加抛飞，也不谎报把人挑上天。
 *
 * 与同族分开：直冲钻是贴地钻穿一整排并犁沟，毒击是带毒的近身延长，百万吨重拳是沿地面的直拳推离；
 * 超级角击是唯一「长蓄势 + 单点窄线 + 把目标挑到空中或钉住」的重刺。
 *
 * 配置 `rip` 由公式改威力、抛飞与钉住时长，由 resolve 改时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const megahornScene = "world_combat:move_megahorn";
    const megahornHornScene = "world_combat:move_megahorn_horn";
    const megahornPin = "world_combat:megahorn_pin";
    const megahornHitText = "world_combat.move.megahorn.text.hit";
    const megahornPinText = "world_combat.move.megahorn.text.pin";
    const megahornTossText = "world_combat.move.megahorn.text.toss";
    const megahornMissText = "world_combat.move.megahorn.text.miss";
    const megahornWallText = "world_combat.move.megahorn.text.wall";

    // 深植的「留刺」只活在这一次减速 carrier 还在的时候：净化/替换/到期随 carrier 一起收，不留失效锚。
    WorldCombat.effect(megahornPin, 1, 12000, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (!MobEffects.validAnchor(value.anchor)) throw new Error("Invalid megahorn pin: anchor");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(megahornPin, "start", function (effect) {
        const world = effect.world(), target = effect.target(), state = JSON.parse(effect.state());
        if (!world.valid(target) || !MobEffects.matches(world, target, state.anchor)) effect.end();
    });
    WorldCombat.effectHandler(megahornPin, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 减速一被清除或替换（牛奶、/effect clear、自然到期、别的来源刷新），这次留刺就地收起。
    WorldCombat.on("world_combat:move_megahorn/pin-fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== "minecraft:slowness") return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target)) return;
        const current = MobEffects.read(world, target, "minecraft:slowness");
        world.effects(target, megahornPin).forEach(function (view) {
            const state = JSON.parse(String(view.data()));
            if (current !== null && MobEffects.matches(world, target, state.anchor)) return;
            world.operation(view.id(), "world_combat:dispel", "{}");
        });
    });

    define({
        freeMovement: true,
        id: "megahorn",
        cooldownParameter: "recharge",
        name: "Megahorn",
        description: "低头刨地蓄足势，再沿身前一条又长又窄的直线把角狠狠送进去：正面只有一条很窄的角线，侧身或走开就能让这一记落空；扎中后可以把目标挑上空中，也可以把角留在伤口里持续减速它。",
        uses: ["长蓄势换一记最重的单点直刺", "把正面的目标挑到空中、脱离阵地", "深植式钉住目标给队友创造机会"],
        kind: "aim",
        range: 3.4,
        maxRange: 4.6,
        prepare: 15,
        active: 16,
        recover: 12,
        cooldown: 40,
        maximumTicks: 220,
        style: "stab",
        defaults: { rip: false, ai: { maxChase: 7, huntTough: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("megahorn", "reach", pokemon), geometry: "line", style: "stab", color: 0xD9A63A,
                label: config && config.rip === true ? "甩角式" : "深植式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["megahorn"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("megahorn", "charge", context)),
                recover: Math.round(p("megahorn", "aftercast", context)),
                cooldown: Math.round(p("megahorn", "recharge", context)),
                active: skills["megahorn"].active,
                range: p("megahorn", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_megahorn:windup", megahornScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, reach: p("megahorn", "reach", action),
                    rip: config && config.rip === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const rip = config && config.rip === true;
            // 真实三维角线：可上下瞄准，角尖沿实际方向送出。
            const heading = WorldGeometry.basis(aim(action), action.direction()).forward;
            const reach = Math.max(2.4, p("megahorn", "reach", action));
            const horn = Math.max(0.24, p("megahorn", "horn", action));
            const rush = Math.max(0, p("megahorn", "rush", action));
            const power = p("megahorn", "gore", action);
            const shards = Math.max(8, Math.round(p("megahorn", "shards", action)));
            const scale = Math.max(0.7, Math.min(1.9, reach / 3.4));
            const intensity = Math.max(0.7, Math.min(2.4, power / 120));
            const vector = [heading.x(), heading.y(), heading.z()];

            // 中性 aim：有实体目标就逼近到角尖边缘，身体用真实扫掠前移，撞到目标或障碍停在接触处；只有方向/世界点时朝瞄准方向趟出整步。
            const self = world.observe(actor);
            if (self !== null && rush > 0.05) {
                const target = action.target();
                const body = target !== null && world.valid(target) ? world.observe(target) : null;
                let advance: number;
                if (body !== null) {
                    const delta = body.position().minus(self.position());
                    const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                    advance = Math.min(rush, Math.max(0, flat - reach * 0.6));
                } else {
                    advance = rush;
                }
                const flatAim = WorldCombat.point(heading.x(), 0, heading.z());
                if (advance > 0.02 && flatAim.length() > 1e-6) {
                    action.moveSweep(flatAim.unit().scale(advance), Math.max(0.3, self.width() / 2));
                }
            }
            const moved = world.observe(actor);
            const origin = moved === null ? action.origin() : moved.position();

            sound(action, "minecraft:item.trident.throw");

            // 角线先由真实墙面截断，判定与画面读同一条线；墙后的人不再被算入。
            const idealEnd = origin.plus(heading.scale(reach));
            const clip = WorldGeometry.blockHit(world, origin, idealEnd);
            const hornEnd = clip === null ? idealEnd : clip.position();
            const impact = action.trace(origin, hornEnd, horn);
            const target = impact.hitEntity() ? impact.target() : null;
            // 角尖停在真实接触点：命中取接触点，否则取墙面/全长尽头。
            const visualEnd = target !== null ? impact.position() : hornEnd;
            WorldFeedback.emit(world, megahornHornScene, 1, origin,
                { moment: "thrust", path: [[origin.x(), origin.y(), origin.z()], [visualEnd.x(), visualEnd.y(), visualEnd.z()]],
                    direction: vector, reach: reach, horn: horn, scale: scale, intensity: intensity }, 18);
            WorldFeedback.emit(world, megahornScene, 1, origin,
                { moment: "thrust", reach: reach, shards: shards, scale: scale, intensity: intensity, direction: vector }, 18);

            if (target === null || !hurt(action, target, "megahorn", power,
                { damage: damageSpec("megahorn", "gore"), contact: true })) {
                if (target === null && clip !== null) {
                    // 墙上硬碰：在真实方块格与表面迸屑，不把角画穿墙体。
                    const cell = clip.blockPosition();
                    WorldFeedback.emit(world, megahornScene, 1, clip.position(),
                        { moment: "wall", shards: shards, scale: scale, intensity: intensity, face: clip.blockFace(),
                            block: cell !== null ? [cell.x(), cell.y(), cell.z()] : undefined }, 20);
                    WorldFeedback.text(world, clip.position().plus(WorldCombat.point(0, 0.9, 0)), megahornWallText, [], 22);
                } else {
                    WorldFeedback.emit(world, megahornScene, 1, visualEnd,
                        { moment: "whiff", reach: reach, scale: scale, intensity: intensity }, 18);
                    WorldFeedback.text(world, visualEnd.plus(WorldCombat.point(0, 1.1, 0)), megahornMissText, [], 22);
                }
                sound(action, "minecraft:entity.player.attack.strong");
                done(action);
                return;
            }

            const landed = world.observe(target);
            const at = landed === null ? impact.position() : landed.position();
            WorldFeedback.emit(world, megahornScene, 1, at,
                { moment: "pierce", target: String(target.ref()), shards: shards, scale: scale, intensity: intensity }, 22);
            sound(action, "cobblemon:impact.bug");

            if (!rip) {
                const pinTicks = Math.max(10, Math.round(p("megahorn", "pinTicks", action)));
                const pinLevel = Math.max(0, Math.round(p("megahorn", "pinLevel", action)));
                // 目标已被这一刺打死就只结算伤害，不再挂减速，也不留刺。
                if (!world.valid(target) || world.observe(target) === null) { done(action); return; }
                const carrier = MobEffects.apply(world, target, "minecraft:slowness", pinTicks, pinLevel);
                if (carrier !== null) {
                    const mark = world.effect(megahornPin, target, JSON.stringify({ anchor: MobEffects.anchor(carrier) }), pinTicks);
                    if (mark > 0) WorldFeedback.onEffect(world, mark, "megahorn:pin:" + String(target.ref()), megahornScene, 1, at,
                        { moment: "pin", target: String(target.ref()), pinTicks: pinTicks, pinLevel: pinLevel, scale: scale, intensity: intensity });
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), megahornPinText, [pinLevel], 26);
                }
                done(action);
                return;
            }

            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), megahornHitText, [Math.round(power)], 24);
            action.after(3, function (next: CombatAction) {
                const scope = next.world();
                // 第二拍只在关系仍成立时结算：目标还是那个、仍在近距、且从施法者到它没有墙。
                const body = scope.valid(target) ? scope.observe(target) : null;
                const self = scope.observe(actor);
                const onHorn = body !== null && self !== null
                    && body.position().minus(self.position()).length() <= reach + 0.6
                    && scope.clear(self.position(), body.position());
                if (!onHorn || body === null) {
                    const from = self === null ? origin : self.position();
                    WorldFeedback.emit(scope, megahornScene, 1, from.plus(heading.scale(reach * 0.6)),
                        { moment: "whiff", reach: reach, scale: scale, intensity: intensity }, 16);
                    WorldFeedback.text(scope, from.plus(WorldCombat.point(0, 1.1, 0)), megahornMissText, [], 20);
                    done(next);
                    return;
                }
                const ripPower = p("megahorn", "rip", next);
                const fling = Math.max(0.2, p("megahorn", "fling", next));
                const flingUp = Math.max(0.1, p("megahorn", "flingUp", next));
                const where = body.position();
                const landedRip = hurt(next, target, "megahorn", ripPower,
                    { damage: damageSpec("megahorn", "gore"), contact: true });
                // 伤害被原生拒绝就不施位移、不播抛飞；只有真正命中后才甩角。
                if (!landedRip) { done(next); return; }
                const flingHeading = WorldGeometry.flatUnit(heading, next.direction());
                const movedDistance = scope.valid(target) ? scope.hitDisplace(target, flingHeading.scale(fling)) : 0;
                const lifted = scope.valid(target) ? scope.hitImpulse(target, WorldCombat.point(0, flingUp, 0)) : false;
                if (movedDistance > 0.001 || lifted) {
                    WorldFeedback.emit(scope, megahornScene, 1, where,
                        { moment: "toss", target: String(target.ref()), fling: fling, flingUp: flingUp,
                            shards: shards, scale: scale, intensity: intensity }, 22);
                    WorldFeedback.text(scope, where.plus(WorldCombat.point(0, 1.3, 0)), megahornTossText, [], 24);
                    scope.sound("minecraft:entity.player.attack.knockback", where, 16, "{}");
                } else {
                    // 推不动：刺伤照算，只把「拔角」那一拍呈现为扎实的刺入，不谎报抛飞。
                    WorldFeedback.emit(scope, megahornScene, 1, where,
                        { moment: "pierce", target: String(target.ref()), shards: shards, scale: scale, intensity: intensity }, 16);
                    WorldFeedback.text(scope, where.plus(WorldCombat.point(0, 1.2, 0)), megahornHitText, [Math.round(ripPower)], 22);
                }
                done(next);
            });
        }
    });
}
