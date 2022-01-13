// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import { Binary } from '../type.js';
import { toUint8Array } from '../util/buffer.js';
import { BufferBuilder, OffsetsBufferBuilder } from './buffer.js';
import { VariableWidthBuilder, BuilderOptions } from '../builder.js';
import { Builder } from './index.js';

/** @ignore */
export class BinaryBuilder<TNull = any> extends Builder<Binary, TNull> {
    protected _pendingLength = 0;
    protected _offsets: OffsetsBufferBuilder;
    protected _pending: Map<number, any> | undefined;
    public setValid(index: number, isValid: boolean) {
        if (!super.setValid(index, isValid)) {
            (this._pending || (this._pending = new Map())).set(index, undefined);
            return false;
        }
        return true;
    }
    public clear() {
        this._pendingLength = 0;
        this._pending = undefined;
        return super.clear();
    }
    public flush() {
        this._flush();
        return super.flush();
    }
    public finish() {
        this._flush();
        return super.finish();
    }
    protected _flush() {
        const pending = this._pending;
        const pendingLength = this._pendingLength;
        this._pendingLength = 0;
        this._pending = undefined;
        if (pending && pending.size > 0) {
            this._flushPending(pending, pendingLength);
        }
        return this;
    }

    constructor(opts: BuilderOptions<Binary, TNull>) {
        super(opts);
        this._offsets = new OffsetsBufferBuilder();
        this._values = new BufferBuilder(new Uint8Array(0));
    }
    public get byteLength(): number {
        let size = this._pendingLength + (this.length * 4);
        this._offsets && (size += this._offsets.byteLength);
        this._values && (size += this._values.byteLength);
        this._nulls && (size += this._nulls.byteLength);
        return size;
    }
    public setValue(index: number, value: Uint8Array) {
        return super.setValue(index, toUint8Array(value));
    }
    protected _flushPending(pending: Map<number, Uint8Array | undefined>, pendingLength: number) {
        const offsets = this._offsets;
        const data = this._values.reserve(pendingLength).buffer;
        let offset = 0;
        for (const [index, value] of pending) {
            if (value === undefined) {
                offsets.set(index, 0);
            } else {
                const length = value.length;
                data.set(value, offset);
                offsets.set(index, length);
                offset += length;
            }
        }
    }
}
