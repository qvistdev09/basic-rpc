# Changelog

## 0.0.11

- fix another typo in package.json exports field
- export more server types

## 0.0.10

- export DependencyArray type from di index
- fix typo in package.json exports field

## 0.0.9

- export types as possible fix for typeerror in consuming packages

## 0.0.8

- merge req and res into ctx object
- add dependency injection system
- add exports field to package.json

## 0.0.7

- fix checking only for null in authentication middleware
- fix client parameters destructuring bug
- set content-type automatically in client

## 0.0.6

- fix bad imports

## 0.0.5

- export types from index file

## 0.0.4

- use in-place defined types in addMiddleware method

## 0.0.3

- use object as client parameter
- fix type issue with inferred client
- change authenticator to accept IncomingMessage instead of authorization-header for flexibility reasons
- parse url query in RpcReq object
- create first tests and add github workflow
- accept custom http server
- use middleware chain structure for error handlers
- improve log messages on server startup

## 0.0.2

- fix client-related type errors

## 0.0.1

- initial release