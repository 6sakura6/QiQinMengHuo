// ============================================================
// InputManager.ts — 键盘输入统一管理（Batch 1）
// 架构约束：Scene 调用 InputManager，Player 读取 InputManager 快照
// 禁止 Player 直接使用 Phaser.Input.Keyboard
// ============================================================

import Phaser from 'phaser';

/** 每帧输入快照（Player 读这个，不接触 Phaser.Input） */
export interface InputSnapshot {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  shoot: boolean;
  interact: boolean;
  /** jump 仅在按下帧为 true（防连跳） */
  jumpJustPressed: boolean;
  /** shoot 仅在按下帧为 true（防连射） */
  shootJustPressed: boolean;
}

/** 按键绑定配置（后续可做设置页面热键重绑定） */
interface KeyBindings {
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  jump: Phaser.Input.Keyboard.Key[];
  shoot: Phaser.Input.Keyboard.Key[];
  interact: Phaser.Input.Keyboard.Key[];
}

export class InputManager {
  private keys!: KeyBindings;
  private _snapshot: InputSnapshot;
  private _prevJump = false;
  private _prevShoot = false;

  constructor(private scene: Phaser.Scene) {
    this._snapshot = this.emptySnapshot();
    this.register();
  }

  // ─────────────────────────────────────────
  // 初始化按键绑定
  // ─────────────────────────────────────────
  private register(): void {
    const kb = this.scene.input.keyboard!;

    const addKeys = (...codes: string[]): Phaser.Input.Keyboard.Key[] =>
      codes.map((c) => kb.addKey(c));

    this.keys = {
      left:     addKeys('LEFT', 'A'),
      right:    addKeys('RIGHT', 'D'),
      up:       addKeys('UP', 'W'),
      down:     addKeys('DOWN', 'S'),
      jump:     addKeys('SPACE', 'UP', 'W'),
      shoot:    addKeys('J', 'Z'),
      interact: addKeys('F', 'E'),
    };
  }

  // ─────────────────────────────────────────
  // 每帧更新（由 Level1Scene.update() 调用）
  // ─────────────────────────────────────────
  update(): void {
    const isDown = (keys: Phaser.Input.Keyboard.Key[]) =>
      keys.some((k) => k.isDown);

    const left     = isDown(this.keys.left);
    const right    = isDown(this.keys.right);
    const up       = isDown(this.keys.up);
    const down     = isDown(this.keys.down);
    const jump     = isDown(this.keys.jump);
    const shoot    = isDown(this.keys.shoot);
    const interact = isDown(this.keys.interact);

    this._snapshot = {
      left,
      right,
      up,
      down,
      jump,
      shoot,
      interact,
      jumpJustPressed:  jump  && !this._prevJump,
      shootJustPressed: shoot && !this._prevShoot,
    };

    this._prevJump  = jump;
    this._prevShoot = shoot;
  }

  /** 清除按键记忆状态（对话/过场结束后调用，防止残留按键触发误操作） */
  reset(): void {
    // 将 prev 状态同步为当前物理按键状态
    // 这样对话结束后，对话期间一直按着的键不会在新帧产生 false JustPressed
    const isDown = (keys: Phaser.Input.Keyboard.Key[]) =>
      keys.some((k) => k.isDown);
    this._prevJump  = isDown(this.keys.jump);
    this._prevShoot = isDown(this.keys.shoot);
    this._snapshot  = this.emptySnapshot();
  }

  /** 获取当前帧输入快照（只读） */
  get snapshot(): Readonly<InputSnapshot> {
    return this._snapshot;
  }

  /** 场景销毁时清理 Key 对象，防止内存泄露 */
  destroy(): void {
    // 逐 Key 调用 destroy()（内部触发 removeAllListeners + plugin.removeKey）
    // 比直接 kb.removeKey() 更可靠：即使 keyboard plugin 已销毁，key.destroy() 仍安全
    for (const keys of Object.values(this.keys)) {
      for (const k of keys) {
        k.destroy();
      }
    }
    // 断引用，确保 GC 能回收 InputManager 自身
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.keys as any) = null;
  }

  private emptySnapshot(): InputSnapshot {
    return {
      left: false, right: false, up: false, down: false,
      jump: false, shoot: false, interact: false,
      jumpJustPressed: false, shootJustPressed: false,
    };
  }
}
