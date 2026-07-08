import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { provideHttpClient } from '@angular/common/http'
import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { ApiService } from './api.service'
import { AuthService, type User } from './auth.service'

describe('AuthService', () => {
  let service: AuthService
  let apiSpy: {
    get: ReturnType<typeof mock>
    post: ReturnType<typeof mock>
  }

  beforeEach(async () => {
    apiSpy = {
      get: mock(),
      post: mock(),
    }

    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideRouter([]),
        { provide: ApiService, useValue: apiSpy },
      ],
    }).compileComponents()

    service = TestBed.inject(AuthService)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })

  it('should login and set user', () => {
    apiSpy.post.mockReturnValue(of({ id: '1', email: 'test@wisp.sh' }))

    service.login('test@wisp.sh', 'password').subscribe()

    expect(apiSpy.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@wisp.sh',
      password: 'password',
    })
    expect(service.user()?.email).toBe('test@wisp.sh')
  })

  it('should register with password field', () => {
    apiSpy.post.mockReturnValue(of({ id: '1', email: 'test@wisp.sh' }))

    service.register('test@wisp.sh', 'password', 'Test').subscribe()

    expect(apiSpy.post).toHaveBeenCalledWith('/auth/register', {
      email: 'test@wisp.sh',
      password: 'password',
      name: 'Test',
    })
  })

  it('should fetch and set current user', () => {
    const user: User = {
      id: '1',
      email: 'test@wisp.sh',
      name: 'Test',
      role: 'user',
    }
    apiSpy.get.mockReturnValue(of(user))

    service.fetchMe().subscribe((result) => {
      expect(result).toEqual(user)
    })

    expect(apiSpy.get).toHaveBeenCalledWith('/auth/me')
    expect(service.user()).toEqual(user)
  })

  it('should logout and clear user', () => {
    service.user.set({
      id: '1',
      email: 'test@wisp.sh',
      name: null,
      role: 'user',
    })
    apiSpy.post.mockReturnValue(of({ ok: true }))

    service.logout()

    expect(service.user()).toBeNull()
    expect(apiSpy.post).toHaveBeenCalledWith('/auth/logout', {})
  })
})
